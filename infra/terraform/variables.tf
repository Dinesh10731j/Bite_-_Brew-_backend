variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "project_name" {
  description = "Application/project name"
  type        = string
  default     = "bite-brew-cafe-backend"
}

variable "environment" {
  description = "Target environment"
  type        = string
}

variable "github_org" {
  description = "GitHub org/user owning the repository"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "github_branch_patterns" {
  description = "Allowed branches for OIDC assume role"
  type        = list(string)
  default     = ["main", "develop"]
}

variable "create_eks_cluster" {
  description = "Set true to provision EKS cluster via Terraform"
  type        = bool
  default     = false
}

variable "eks_cluster_name" {
  description = "Existing or to-be-created EKS cluster name"
  type        = string
}

variable "vpc_id" {
  description = "Existing VPC ID used when create_eks_cluster is true"
  type        = string
  default     = null
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for EKS nodes"
  type        = list(string)
  default     = []
}
