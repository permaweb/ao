# creating handlers WIP

AO handlers allow you to intercept an incoming message, check for "some" pattern, and run a function if the "pattern" matches.

For example,  you may want to setup a handler that checks if you're on vacation (pattern matches date to your vacation range) and responds to any messages you receive by letting the sender know you're on vacation.

`msg => aos(msg) => handlers => (msg) => pattern(msg) => handle(msg)`

Let's make some handlers.

<!-- toc -->

- [Prerequisites](#prerequisites)
- [Check handlers](#check-handlers)
- [Create handler function](#create-handler-function)
- [Send a Message 1](#send-a-message-1)
- [Prepend to handlers](#prepend-to-handlers)
- [Send a Message 2](#send-a-message-2)

<!-- tocstop -->

## Prerequisites

- 2 AOS processes running

## Check handlers

```sh
aos> #handlers.list
```

You should see 0 if this is a fresh AOS process.

## Create handler function

Open the editor in AOS using Process 1 (whichever open process you want to pick as process 1):

```zsh
.editor
```

You should see this:

`<editor mode> use '.done' to submit or '.cancel' to cancel`

Add a handler that will ALWAYS run:

```lua
-- append(pattern, handler, 'name')
handlers.append(
  -- pattern matcher
  function (msg)
    -- Check if your pattern matches
    -- Maybe you're looking for a specific tag in msg.tags?
    
    -- if pattern matches -- return 1 to run the handle function 
    -- and "continue" with the next handler
    -- return -1 to run the handle function and NOT run any other handlers
    return 1
    -- If pattern doesnt match return 0 and continue
    -- return 0
  end,
  -- handle
  function (msg, env)
    table.insert(inbox, msg)
    ao.send({ body = "Haha!"}, msg.from)
  end,
  --name
  "laugh"
)
```

## Send a Message 1

Okay, it's time for Process 2.  You should only have one other AO process running.  Move over to that one.

```zsh
aos> send("<process1 id>", "Test!")
```

To see what your latest message is:

```zsh
aos> inbox[#inbox]
```

You can get the `processId` by using the printing the `ao.id` variable:

```zsh
aos> ao.id
```

For this handler, we want to "prepend" it to `handlers`.  We will use the `prepend` function instead of `append`.  This handler will run BEFORE the previous one.

Let's just smile before we laugh.

You should be able to check your inbox and see how many messages you have (1 if you're using fresh processes):

```zsh
aos> #inbox

```

## Prepend to handlers

```lua
-- append(pattern, handler, 'name')
handlers.prepend(
  -- pattern matcher
  function (msg)
    -- Check if your pattern matches
    -- Maybe you're looking for a specific tag in msg.tags?
    
    -- if pattern matches -- return 1 to run the handle function 
    -- and "continue" with the next handler
    -- return -1 to run the handle function and NOT run any other handlers
    return 1
    -- If pattern doesnt match return 0 and continue
    -- return 0
  end,
  -- handle
  function (msg, env)
    table.insert(inbox, msg)
    ao.send({ body = "😊"}, msg.from) 
  end,
  --name
  "smile"
)
```

## Send a Message 2

Another message!

```zsh
aos> send("<process1 id>", "Test!")
```

If you need an idea for a handler, feel free to check to see if the message is from me and send me tokens if it is!

This time, the last message `inbox[#inbox]` will be *Haha!* and the second to last message `inbox[#inbox - 1]` will be 😊.

Now all you need to do is figure out the pattern you'd like to match and start buidling handlers!
