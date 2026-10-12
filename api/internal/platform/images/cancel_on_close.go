package images

import (
	"context"
	"io"
)

// cancelOnClose ends a request's timeout once its body is closed, so the body can still be read after
// adminRequest returns.
type cancelOnClose struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (c cancelOnClose) Close() error {
	defer c.cancel()
	return c.ReadCloser.Close()
}
