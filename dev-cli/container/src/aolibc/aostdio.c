#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <emscripten.h>

#if 0
#define AO_LOG(...) fprintf(stderr, __VA_ARGS__)
#else
#define AO_LOG(...)
#endif

// WeaveDrive async wrapper functions. These allow us to call the WeaveDrive
// async JS code from C.
EM_ASYNC_JS(int, weavedrive_open, (const char* c_filename, const char* mode), {
    const filename = UTF8ToString(Number(c_filename));
    if (!Module.WeaveDrive) {
        return Promise.resolve(null)
    }

    const drive = Module.WeaveDrive(Module, FS);
    return await drive.open(filename);
});

EM_ASYNC_JS(int, weavedrive_read, (int fd, int *dst_ptr, size_t length), {
    const drive = Module.WeaveDrive(Module, FS);
    return Promise.resolve(await drive.read(fd, dst_ptr, length));
});

EM_ASYNC_JS(int, weavedrive_close, (int fd), {
  const drive = Module.WeaveDrive(Module, FS);
  return drive.close(fd);
});

FILE* fopen(const char* filename, const char* mode) {
    AO_LOG( "AO: Called fopen: %s, %s\n", filename, mode);
    int fd = weavedrive_open(filename, mode);
    AO_LOG( "AO: weavedrive_open returned fd: %d\n", fd);
    // If we get a file desciptor, we return a FILE*, else 0.
    if (!fd) {
        return 0;
    }
    return fdopen(fd, mode);
}

size_t fread(void* ptr, size_t size, size_t nmemb, FILE* stream) {
    int fd = fileno(stream);
    weavedrive_read(fd, ptr, size * nmemb);
    return nmemb;
}

int fclose(FILE* stream) {
     AO_LOG( "AO: fclose called\n");
     int fd = fileno(stream);
     weavedrive_close(fd);
     return 0;  // Returning success, adjust as necessary
}

void* realloc(void* ptr, size_t size) {
    void* new_ptr = memalign(16, size);
    memcpy(new_ptr, ptr, size);
    free(ptr);
    //AO_LOG("DBG: Realloc called: %p -> %p, size: %zu\n", ptr, new_ptr, size);
    return new_ptr;
}

// Emscripten malloc does not align to 16 bytes correctly, which causes some 
// programs that use aligned memory (for example, those that use SIMD...) to
// crash. So we need to use the aligned allocator.
void* malloc(size_t size) {
    return memalign(16, size);
}

int madvise(void* addr, size_t length, int advice) {
    AO_LOG("AO: madvise called with addr: %p, length: %zu, advice: %d\n", addr, length, advice);
    return 0;
}

void* mmap(void* addr, size_t length, int prot, int flags, int fd, off_t offset) {
    AO_LOG("AO: mmap called with addr: %p, length: %zu, prot: %d, flags: %d, fd: %d, offset: %d\n", addr, length, prot, flags, fd, offset);
    // Allocate a buffer that fits with emscripten's normal allignments 
    void* buffer = memalign(65536, length);
    AO_LOG("AO: mmap: Reading from arweave to: %p, length: %zu\n", buffer, length);
    weavedrive_read(fd, buffer, length);
    AO_LOG("AO: mmap returned: %p\n", buffer);
    return buffer;
}

/*
int munmap(void* addr, size_t length) {
    AO_LOG("AO: munmap called with addr: %p, length: %zu\n", addr, length);
    return 0;
}
*/
