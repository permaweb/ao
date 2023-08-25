package binder

import (
	"github.com/gin-gonic/gin/binding"
)

func Validate(obj interface{}) error {
	if binding.Validator == nil {
		return nil
	}
	return binding.Validator.ValidateStruct(obj)
}
