package authQueries

type Queries struct {
	Register            string
	RetrieveUserByEmail string
	Login               string
}

var Query = Queries{
	Register:            "INSERT INTO users(email,username, hashed_password) VALUES($1, $2,$3)",
	RetrieveUserByEmail: "SELECT id,username,email,hashed_password FROM users WHERE email = $1",
}
