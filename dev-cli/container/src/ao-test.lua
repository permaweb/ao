local t = require('@rakis/test-unit').new('ao test suite')
local ao = require('ao')

t:add('Check clone returns on non table', function ()
  assert(ao.clone(1) == 1, 'clone should return a non-table back')
  assert(ao.clone('test') == 'test', 'clone should return a non-table back')
end)

t:add('Check clone success', function ()
  local t1 = { a = 1, b = 2 }
  local t1_clone = ao.clone(t1)
  assert(t1.a == t1_clone.a, 'deep copy failed')
  assert(t1.b == t1_clone.b, 'deep copy failed')
end)

t:add('Check normalization on included tag', function ()
  local msg = {
    Tags = {
      { name = 'Data-Protocol', value = 'test' }
    }
  }
  local normalized = ao.normalize(msg)
  assert(normalized.Tags[1].name == 'Data-Protocol', 'normalize should not extract included tags')
end)

t:add('Check normalization on non-included tag', function ()
  local msg = {
    Tags = {
      { name = 'ExtractableTag', value = 'test' }
    }
  }
  local normalized = ao.normalize(msg)
  assert(normalized.ExtractableTag == 'test', 'normalize should extract non included tags')
end)

t:add('Check normalization on combo of included and non-included tags', function ()
  local msg = {
    Tags = {
      { name = 'ExtractableTag', value = 'test' },
      { name = 'ExtractableTag2', value = 'test' },
      { name = 'Owner', value = 'test' }
    }
  }
  local normalized = ao.normalize(msg)
  assert(normalized.ExtractableTag == 'test', 'normalize should extract non included tags')
  assert(normalized.ExtractableTag2 == 'test', 'normalize should extract non included tags')
  assert(normalized.Owner == nil, 'normalize should not extract included tags')
end)

t:add('Check sanitize', function ()
  local msg = {
    ['Data-Protocol'] = 'test',
    ['Hash-Chain'] = 'test',
    ['Custom-Tag'] = 'test'
  }

  local sanitized = ao.sanitize(msg)
  assert(sanitized['Data-Protocol'] == nil, 'sanitize should remove Data-Protocol')
  assert(sanitized['Custom-Tag'] == 'test', 'sanitize should not remove custome tags')
end)

t:add('Check environment initilization with module and authority', function ()
  local env = {
    Process = {
      Id = 'test',
      Tags = {
        { name = 'Module', value = 'test-module' },
        { name = 'Authority', value = 'test-authority' }
      }
    }
  }
  local init = ao.init(env)
  assert(ao._module == 'test-module', 'module should be set')
  assert(ao.authorities[1] == 'test-authority', 'authority should be set')
  assert(ao.id == 'test', 'id should be set')
end)

t:add('Check send, reference increment and tag setting', function ()
  local msg = {
    Target = 'test',
    Data = 'test',
    Tags = {
      { name = 'Custom-Tag', value = 'test' }
    },
    TestTag = 'test'
  }
  local message = ao.send(msg)
  assert(ao.Reference == 1, 'reference number should be incremented')
  assert(message.Target == 'test', 'target should be set')
  assert(message.Data == 'test', 'data should be set')
  assert(message.Tags[5].name == 'TestTag', 'Top level tags should be moved to tags table')
  assert(message.Tags[6].name == 'Custom-Tag', 'custom tags should be set')
end)

t:add('Check message onReply and receive present', function ()
  local msg = {
    Target = 'test',
    Data = 'test',
    Tags = {
      { name = 'Custom-Tag', value = 'test' }
    },
    TestTag = 'test'
  }
  local message = ao.send(msg)
  assert(type(message.onReply) == 'function', 'onReply function should be present')
  assert(type(message.receive) == 'function', 'receive function should be present')
end)

t:add('Call onreply, verify call to Handlers.once and Handlers.receive', function ()
  Handlers.once = function(event, resolver)
      -- Mock implementation of the once function
      Handlers._once_called = true
      Handlers._once_event = event
      Handlers._once_resolver = resolver
  end
  Handlers.receive = function(event)
      -- Mock implementation of the receive function
      Handlers._receive_called = true
      Handlers._receive_event = event
      return "Received message"
  end
  Handlers._once_called = false
  Handlers._receive_called = false
  local msg = {
    Target = 'test',
    Data = 'test',
    Tags = {
      { name = 'Custom-Tag', value = 'test' }
    },
    TestTag = 'test'
  }
  local message = ao.send(msg)
  assert(type(message.onReply) == 'function', 'onReply function should be present')
  assert(type(message.receive) == 'function', 'receive function should be present')
  local test_resolver = function() end
  message.onReply('test_from', test_resolver)
  assert(Handlers._once_called, 'Handlers.once should be called')
  assert(Handlers._once_event.From == 'test_from', 'Handlers.once should be called with correct event.From')
  assert(Handlers._once_event['X-Reference'] == message.Reference, 'Handlers.once should be called with correct X-Reference')
  assert(Handlers._once_resolver == test_resolver, 'Handlers.once should be called with correct resolver')

  -- Call the receive function and verify the Handlers.receive call
  local received_message = message.receive()
  assert(Handlers._receive_called, 'Handlers.receive should be called')
  assert(Handlers._receive_event.From == message.Target, 'Handlers.receive should be called with correct event.From')
  assert(Handlers._receive_event['X-Reference'] == message.Reference, 'Handlers.receive should be called with correct X-Reference')
  assert(received_message == 'Received message', 'Handlers.receive should return correct message')
end)

t:add('Check spawn reference number incrementing, and tag setting', function ()
  local spawn = ao.spawn(
    'test-module',
    {
      Data = 'test',
      Tags = {
        { name = 'Custom-Tag', value = 'test' }
      },
      TestTag = 'test'
    }
  )
  -- Reference is 4 at this point because of the previous tests
  assert(ao.Reference == 4, 'reference number should be incremented')
  assert(spawn.Data == 'test', 'data should be set')
  assert(spawn.Tags[8].name == 'TestTag', 'Top level tags should be moved to tags table')
  assert(spawn.Tags[9].name == 'Custom-Tag', 'custom tags should be set')
end)

t:add('Verify operation of spawn .after and .receive function', function ()
  Handlers.once = function(event, callback)
      -- Mock implementation of the once function
      Handlers._once_called = true
      Handlers._once_event = event
      Handlers._once_callback = callback
  end
  Handlers.receive = function(event)
      -- Mock implementation of the receive function
      Handlers._receive_called = true
      Handlers._receive_event = event
      return "Received spawn message"
  end
  Handlers._once_called = false
  Handlers._receive_called = false

  local spawn = ao.spawn(
      'test-module',
      {
          Data = 'test',
          Tags = {
              { name = 'Custom-Tag', value = 'test' }
          },
          TestTag = 'test'
      }
  )

  -- Check if the receive function is present
  assert(type(spawn.receive) == 'function', 'receive function should be present')

  -- Call the after function and verify the Handlers.once call
  local test_callback = function() end
  spawn.after(test_callback)
  assert(Handlers._once_called, 'Handlers.once should be called')
  assert(Handlers._once_event.Action == 'Spawned', 'Handlers.once should be called with correct event.Action')
  assert(Handlers._once_event.From == ao.id, 'Handlers.once should be called with correct event.From')
  assert(Handlers._once_event.Reference == tostring(ao.Reference), 'Handlers.once should be called with correct Reference')
  assert(Handlers._once_callback == test_callback, 'Handlers.once should be called with correct callback')

  -- Call the receive function and verify the Handlers.receive call
  local received_message = spawn.receive()
  assert(Handlers._receive_called, 'Handlers.receive should be called')
  assert(Handlers._receive_event.Action == 'Spawned', 'Handlers.receive should be called with correct event.Action')
  assert(Handlers._receive_event.From == ao.id, 'Handlers.receive should be called with correct event.From')
  assert(Handlers._receive_event.Reference == tostring(ao.Reference), 'Handlers.receive should be called with correct Reference')
  assert(received_message == 'Received spawn message', 'Handlers.receive should return correct message')
end)


return t:run()