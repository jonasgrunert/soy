# SOY

A simple but effective HTTP backend for OpenTofu and Terraform.

## Features

- HTTP Basic Auth configurable via ENV or file
- Locking
- Versioning by storing previous versions
- File based storage completely self contained

## Usage

```hcl
terraform {
  backend "http" {
    address        = "http://host.docker.internal:9000/state"
    lock_address   = "http://host.docker.internal:9000/lock"
    unlock_address = "http://host.docker.internal:9000/lock"
    lock_method    = "PUT"
    unlock_method  = "DELETE"
  }
}
```

It is recommended to set the enviroment parameters with TF_HTTP_USERNAME and TF_HTTP_PASSWORD.

## Deployment Options

### Docker Standalone

```bash
docker run -e USERNAME=<username> -e PASSWORD=<password> ghcr.io/jonasgrunert/soy:latest
```

### Docker Compose

```yaml
version: "3.8"

services:
  soy:
    image: ghcr.io/jonasgrunert/soy
    environment:
      - USERNAME_FILE=/run/secrets/username
      - PASSWORD_FILE=/run/secrets/password
    secrets:
      - username
      - password

secrets:
  username:
    file: ./username.txt
  password:
    file: ./password.txt
```

### OpenTofu (Terraform)

```hcl
terraform {
    required_providers {
        docker ={
            source = "kreuzwerker/docker"
            version = "3.6.2"
        }
    }
}

provider "docker" {
    host = "unix:///var/run/docker.sock"
}

resource "docker_secret" "username" {
    name = "username"
    data = base64encode(<username>)
}

resource "docker_secret" "password" {
    name = "password"
    data = filebase64(<password>)
}

resource "docker_service" "soy" {
    name = "soy"

    task_spec {
        container_spec {
            image = "ghcr.io/jonasgrunert/soy:latest"

            env = {
                USERNAME_FILE = "/run/secrets/username"
                PASSWORD_FILE = "/run/secrets/password"
            }

            secrets {
                secret_id   = docker_secret.username.id
                file_name  = "/run/secrets/username"
            }

            secrets {
                secret_id   = docker_secret.password.id
                file_name  = "/run/secrets/password"
            }
        }
    }
}
```

## Configuration Options

You can configure the following environemt variables:

```.env
PORT=80 # The port on which the server listens
USERNAME # The username for basic auth, takes precedence to USERNAME_FILE
USERNAME_FILE # A file from which to read the username for basic auth
PASSWORD # The password for basic auth takes precedence to PASSWORD_FILE
PASSWORD_FILE # A file from which to read the password for basic auth
STORAGE=file # Storage type, currently only file is supported
STATEDIR=/state # Where to store state in files
```
