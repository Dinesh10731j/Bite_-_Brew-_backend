output "ecr_repository_url" {
  value       = aws_ecr_repository.app.repository_url
  description = "ECR repository URI"
}

output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions.arn
  description = "IAM role ARN for GitHub Actions OIDC"
}

output "eks_cluster_name" {
  value       = var.create_eks_cluster ? module.eks.cluster_name : var.eks_cluster_name
  description = "EKS cluster name used by deployments"
}
