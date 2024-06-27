#ifndef PROCESS_H
#define PROCESS_H

class Process
{
public:
  const char *version;

public:
  Process();
  ~Process()
  {
  }
  const char *handle(const char *arg_0, const char *arg_1);
};

#endif

// Handle Functions Is Wrapped By The loader.lua and call the process.handle function in the lua script
// Guessing I should probably expose a c function to be called in replacement of process.handle in the lua script
// That c function can handle calling loading and calling the process lua script or the c equivalent function defined in process.c

// AO init -- custom get a src dir with a process.c with a handle function with message as string

// Comment in middle of handle function saying insert code here.

// Allow loading libs.
