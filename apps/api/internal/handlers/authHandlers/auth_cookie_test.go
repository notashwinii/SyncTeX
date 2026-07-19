package authHandlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	authservices "github.com/synctex-org/backend/internal/services/authServices"
)

func TestSetAuthCookies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)

	setAuthCookies(context, "access", "refresh", "csrf", true)

	cookies := recorder.Result().Cookies()
	if len(cookies) != 4 {
		t.Fatalf("cookie count = %d, want 4", len(cookies))
	}

	byName := make(map[string]*http.Cookie, len(cookies))
	for _, cookie := range cookies {
		byName[cookie.Name] = cookie
		if cookie.SameSite != http.SameSiteLaxMode {
			t.Errorf("%s SameSite = %v, want Lax", cookie.Name, cookie.SameSite)
		}
		if !cookie.Secure {
			t.Errorf("%s Secure = false, want true", cookie.Name)
		}
	}

	if cookie := byName[authservices.AccessCookieName]; cookie == nil ||
		!cookie.HttpOnly ||
		cookie.Path != "/" {
		t.Errorf("access cookie = %#v", cookie)
	}
	if cookie := byName[authservices.RefreshCookieName]; cookie == nil ||
		!cookie.HttpOnly ||
		cookie.Path != refreshCookiePath {
		t.Errorf("refresh cookie = %#v", cookie)
	}
	if cookie := byName[authservices.CSRFCookieName]; cookie == nil ||
		cookie.HttpOnly ||
		cookie.Path != csrfCookiePath {
		t.Errorf("CSRF cookie = %#v", cookie)
	}
	if cookie := byName[authservices.SessionCookieName]; cookie == nil ||
		!cookie.HttpOnly ||
		cookie.Path != "/" ||
		cookie.Value != "active" {
		t.Errorf("session marker cookie = %#v", cookie)
	}
}
