module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  create = var.create_eks_cluster

  cluster_name    = var.eks_cluster_name
  cluster_version = "1.30"

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  enable_cluster_creator_admin_permissions = true

  eks_managed_node_groups = {
    default = {
      instance_types = ["t3.large"]
      min_size       = 2
      max_size       = 8
      desired_size   = 3
    }
  }
}
