package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	h, _ := bcrypt.GenerateFromPassword([]byte("validPassword"), bcrypt.DefaultCost)
	fmt.Print(string(h))
}
