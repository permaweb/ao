Install `terragrunt` if you dont have it yet. On mac os you can run:

```sh
brew install terragrunt
```

1. Make sure you have security credentials activated with `aws-vault`

2. Go to environment you wish to handle:

```sh
cd terraform/enivornments/production
```

3. Use terragrunt as you would terraform (plan & apply)

```sh
terragrunt plan
```

```sh
terragrunt apply
```
