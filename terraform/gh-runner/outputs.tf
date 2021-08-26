output "gh_secret_id" {
  description = "Secret Manager ID and version of the github secrets (token, repo_name,repo_owner)"
  value       = google_secret_manager_secret_version.gh-secret-version.name
}

output "mig-instance-group" {
  description = "The instance group url of the created MIG"
  value       = module.mig.instance_group
}

output "mig-instance-template" {
  description = "The name of the MIG Instance Template"
  value       = module.mig_template.name
}
