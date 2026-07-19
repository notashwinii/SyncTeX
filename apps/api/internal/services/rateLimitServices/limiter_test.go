package ratelimitservices

import "testing"

func TestResultInt64RejectsUnexpectedType(t *testing.T) {
	if _, err := resultInt64("1"); err == nil {
		t.Fatal("resultInt64() accepted a string")
	}
}

func TestRandomMemberUsesFreshRandomness(t *testing.T) {
	first, err := randomMember()
	if err != nil {
		t.Fatalf("first randomMember() error = %v", err)
	}
	second, err := randomMember()
	if err != nil {
		t.Fatalf("second randomMember() error = %v", err)
	}
	if first == second {
		t.Fatal("randomMember() returned the same value twice")
	}
}
