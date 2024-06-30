
#include "process.h"
#include "ao.h"
#include <stdio.h>

AO ao;

Process::Process()
{
  version = "1.0.0";
}

const char *Process::handle(const char *env, const char *msg)
{
  ao.init(env);
  printf("arg0: %s\n", env);
  printf("arg1: %s\n", msg);
  return "{\"ok\": true,\"response\":{\"Output\":\"pong\" },\"Memory\":50000000}";
}
