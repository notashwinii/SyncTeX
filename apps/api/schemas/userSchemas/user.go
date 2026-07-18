package userSchemas

type User struct {
	ID             string
	UserName       string
	Email          string
	HashedPassword []byte
}

type UserSearchResult struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}
