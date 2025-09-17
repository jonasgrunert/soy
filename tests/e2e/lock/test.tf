terraform {
  backend "http" {
    address        = "http://host.docker.internal:9000/state"
    lock_address   = "http://host.docker.internal:9000/lock"
    unlock_address = "http://host.docker.internal:9000/lock"
    lock_method    = "PUT"
    unlock_method  = "DELETE"
  }
}
