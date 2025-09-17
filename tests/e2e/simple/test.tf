terraform {
  backend "http" {
    address = "http://host.docker.internal:9000/state"
  }
}
