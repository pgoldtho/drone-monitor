locals {
  startup_script  = file("${path.module}/scripts/startup.sh")
  shutdown_script = file("${path.module}/scripts/shutdown.sh")
}

/*********************************************************************
  Runner Secrets

  Populate a Cloud Secret with values to extract and use in instance
  startup and shutdown scripts
 *********************************************************************/
resource "google_secret_manager_secret" "gh-runner-secret" {
  provider  = google-beta
  project   = var.project_id
  secret_id = "gh-runner-registration"

  labels = {
    label = "gh-token"
  }

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}
resource "google_secret_manager_secret_version" "gh-secret-version" {
  provider = google-beta
  secret   = google_secret_manager_secret.gh-runner-secret.id
  secret_data = jsonencode({
    "REPO_URL"          = var.repo_url
    "GITHUB_AUTH_TOKEN" = var.gh_auth_token
    "GITHUB_API_BASE"   = var.gh_api_base
    "GH_RUNNER_VERSION" = var.gh_runner_version
  })
}

resource "google_secret_manager_secret_iam_member" "gh-secret-member" {
  provider  = google-beta
  project   = var.project_id
  secret_id = google_secret_manager_secret.gh-runner-secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.service_account}"
}

/*********************************************************************
  Runner GCE Instance Template

  Instance template relies on bash scripts to register the runner on
  startup and deregister on shutdown.
 *********************************************************************/
module "mig_template" {
  source             = "terraform-google-modules/vm/google//modules/instance_template"
  version            = "~> 5.0"
  project_id         = var.project_id
  machine_type       = var.machine_type
  source_image_family  = var.source_image_family
  source_image_project = var.source_image_project
  disk_type            = "pd-ssd"
  disk_size_gb         = 10
  enable_shielded_vm = true
  shielded_instance_config = {
    "enable_integrity_monitoring": true,
    "enable_secure_boot": true,
    "enable_vtpm": true
  }
  subnetwork         = var.subnet_name
  region             = var.region
  subnetwork_project = var.subnetwork_project
  service_account = {
    email = var.service_account
    scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }
  auto_delete          = true
  name_prefix          = var.name_prefix
  startup_script       = local.startup_script
  metadata = merge({
    "secret-id" = google_secret_manager_secret_version.gh-secret-version.name
    }, {
    "shutdown-script" = local.shutdown_script
  }, var.custom_metadata)
  tags = [
    "gh-runner-vm"
  ]
}
/*********************************************************************
  Runner MIG
 *********************************************************************/
module "mig" {
  source             = "terraform-google-modules/vm/google//modules/mig"
  version            = "~> 5.0"
  project_id         = var.project_id
  subnetwork_project = var.subnetwork_project
  hostname           = var.instance_name
  region             = var.region
  instance_template  = module.mig_template.self_link
  target_size        = var.target_size

  /* autoscaler */
  autoscaling_enabled = true
  cooldown_period     = var.cooldown_period
}
