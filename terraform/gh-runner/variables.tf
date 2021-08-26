/*********************************************************************
  Project Variables
*********************************************************************/
variable "project_id" {
  type        = string
  description = "The project id to deploy Github Runner"
}
variable "region" {
  type        = string
  description = "The GCP region to deploy instances into"
}

variable "service_account" {
  description = "Service account email address"
  type        = string
}

variable "subnetwork_project" {
  type        = string
  description = "The ID of the project in which the subnetwork belongs."
}

variable "subnet_name" {
  type        = string
  description = "Name for the subnet"
}

/*********************************************************************
  Values to place in a Cloud Secret for use in the instance scripts:
  "REPO_URL"          = var.repo_url
  "GITHUB_AUTH_TOKEN" = var.gh_auth_token
  "GITHUB_API_BASE"   = var.gh_api_base
  "GH_RUNNER_VERSION" = var.gh_runner_version
*********************************************************************/
variable "repo_url" {
  type        = string
  description = "Repo URL for the Github Action"
}

variable "gh_auth_token" {
  type        = string
  description = "Github bearer token that is used for generating Self Hosted Runner Token"
}

variable "gh_api_base" {
  type        = string
  description = "Github domain"
}

variable "gh_runner_version" {
  type = string
  description="GH_RUNNER_VERSION"
  default = "2.276.1"
}

/*********************************************************************
  GCE Template Variables
*********************************************************************/
variable "machine_type" {
  type        = string
  description = "The GCP machine type to deploy"
  default     = "e2-micro"
}

variable "source_image_family" {
  type        = string
  description = "Source image family."
  default     = "ubuntu-1804-lts"
}

variable "source_image_project" {
  type        = string
  description = "Project where the source image comes from"
  default     = "ubuntu-os-cloud"
}

variable "name_prefix" {
  type = string
  description = "instance name prefix"
  default = "gh-runner-linux"
}

variable "custom_metadata" {
  type        = map
  description = "User provided custom metadata"
  default     = {}
}

/*********************************************************************
  MIG Variables
*********************************************************************/

variable "instance_name" {
  type        = string
  description = "The gce instance name"
  default     = "vmghrgcpgov"
}

variable "target_size" {
  type        = number
  description = "The number of runner instances"
  default     = 2
}

variable "cooldown_period" {
  description = "The number of seconds that the autoscaler should wait before it starts collecting information from a new instance."
  default     = 300
}
