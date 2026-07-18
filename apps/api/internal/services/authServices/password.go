package authservices

import (
	"fmt"
	validator "github.com/wagslane/go-password-validator"
)

// MinEntropyBits is the minimum entropy bits required for a password
// 60 bits is considered strong (can withstand offline attacks)
const MinEntropyBits = 60

type PasswordError struct {
	Field   string
	Message string
}

func (e *PasswordError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

func ValidatePassword(password string) error {
	err := validator.Validate(password, MinEntropyBits)
	if err != nil {
		return &PasswordError{
			Field:   "password",
			Message: err.Error(),
		}
	}
	return nil
}
