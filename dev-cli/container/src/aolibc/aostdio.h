#include <stdio.h>
extern int weavedrive_open_c(const char* c_filename, const char* mode);
extern int weavedrive_read_c(int fd, int *dst_ptr, size_t length);
extern int weavedrive_close_c(int fd);