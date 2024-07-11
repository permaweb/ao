
#include "ao.h"
#include <stdio.h>

const char *process_handle(const char *arg_0, const char *arg_1)
{
  ao_init(arg_0);
  printf("arg0: %s\n", arg_0);
  printf("arg1: %s\n", arg_1);
  
  return "{\"ok\": true,\"response\":{\"Output\":\"pong\" },\"Memory\":50000000}";
}
