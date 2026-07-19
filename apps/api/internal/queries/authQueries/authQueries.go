package authQueries

type Queries struct {
	RetrieveUserByEmail string
}

var Query = Queries{
	RetrieveUserByEmail: "SELECT id,username,email,hashed_password FROM users WHERE email = $1",
}
