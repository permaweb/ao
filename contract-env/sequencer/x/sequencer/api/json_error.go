package api

import (
	"encoding/json"
	"net/http"
)

type httpStatus struct {
	Code int    `json:"code"`
	Text string `json:"text"`
}

type httpJsonError struct {
	ErrorType    string     `json:"type"`
	ErrorMessage string     `json:"message"`
	Status       httpStatus `json:"status"`
}

// Writes a bad request error in the form of JSON to the HTTP response
func BadRequestError(w http.ResponseWriter, err error, errorType string) {
	jsonError := createJsonError(err.Error(), errorType, http.StatusBadRequest)
	writeError(w, jsonError)
}

// Writes a internal server error in the form of JSON to the HTTP response (takes an error as a string)
func InternalServerErrorString(w http.ResponseWriter, err string, errorType string) {
	jsonError := createJsonError(err, errorType, http.StatusBadRequest)
	writeError(w, jsonError)
}

// Writes a internal server error in the form of JSON to the HTTP response
func InternalServerError(w http.ResponseWriter, err error, errorType string) {
	InternalServerErrorString(w, err.Error(), errorType)
}

func createJsonError(err string, errorType string, code int) httpJsonError {
	return httpJsonError{
		ErrorType:    errorType,
		ErrorMessage: err,
		Status: httpStatus{
			Code: code,
			Text: http.StatusText(code),
		},
	}
}

func writeError(w http.ResponseWriter, jsonError httpJsonError) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(jsonError.Status.Code)
	if err := json.NewEncoder(w).Encode(jsonError); err != nil {
		panic(err)
	}
}
