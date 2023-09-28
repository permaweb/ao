--- hyper63/either module (Converted to LUA by jshaw via chatgpt)
---
--- This module implements the either monad the codebase is largely based from Dr. Boolean - Brian Lonsdorf and his
--- frontend masters courses. The two reasons for pulling these into independent modules is that over time
--- we may want to add additional helper functions to the type, and to reduce third party dependencies.
---

--- @table Either
--- @field isLeft function
--- @field chain function
--- @field ap function
--- @field alt function
--- @field extend function
--- @field concat function
--- @field traverse function
--- @field map function
--- @field toString function
--- @field extract function

--- @param x any
--- @return Either
function Right(x)
  return {
      isLeft = false,
      chain = function(f) return f(x) end,
      ap = function(other) return other.map(x) end,
      alt = function(other) return Right(x) end,
      extend = function(f) return f(Right(x)) end,
      concat = function(other)
          return other.fold(
              function(x) return other end,
              function(y) return Right(x .. y) end
          )
      end,
      traverse = function(of, f) return f(x):map(Right) end,
      map = function(f) return Right(f(x)) end,
      fold = function(_, g) return g(x) end,
      toString = function() return "Right(" .. x .. ")" end,
      extract = function() return x end
  }
end

--- @param x any
--- @return Either
function Left(x)
  return {
      isLeft = true,
      chain = function(_) return Left(x) end,
      ap = function(_) return Left(x) end,
      extend = function(_) return Left(x) end,
      alt = function(other) return other end,
      concat = function(_) return Left(x) end,
      traverse = function(of, _) return of(Left(x)) end,
      map = function(_) return Left(x) end,
      fold = function(f, _) return f(x) end,
      toString = function() return "Left(" .. x .. ")" end,
      extract = function() return x end
  }
end

--- @param x any
--- @return Either
function of(x)
  return Right(x)
end

--- @param f function
--- @return Either
function tryCatch(f)
  local success, result = pcall(f)
  if success then
      return Right(result)
  else
      return Left(result)
  end
end

--- @param x any
--- @return Either
function fromNullable(x)
  return x ~= nil and Right(x) or Left(x)
end

Either = {
  Right = Right,
  Left = Left,
  of = of,
  tryCatch = tryCatch,
  fromNullable = fromNullable
}

return Either;