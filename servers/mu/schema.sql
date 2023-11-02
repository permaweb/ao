-- Create the transactions table
CREATE TABLE "transactions" (
  "id" SERIAL PRIMARY KEY,
  "_id" VARCHAR(255) NOT NULL UNIQUE,
  "data" JSONB NOT NULL,
  "processId" VARCHAR(255) NOT NULL,
  "cachedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create the messages table
CREATE TABLE "messages" (
  "id" SERIAL PRIMARY KEY,
  "_id" VARCHAR(255) NOT NULL UNIQUE,
  "fromTxId" VARCHAR(255) NOT NULL,
  "toTxId" VARCHAR(255),
  "msg" JSONB NOT NULL,
  "cachedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create the spawns table
CREATE TABLE "spawns" (
  "id" SERIAL PRIMARY KEY,
  "_id" VARCHAR(255) NOT NULL UNIQUE,
  "fromTxId" VARCHAR(255) NOT NULL,
  "toTxId" VARCHAR(255),
  "spawn" JSONB NOT NULL,
  "cachedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create the monitored processes table
CREATE TABLE "monitored_processes" (
  "id" SERIAL PRIMARY KEY,
  "_id" VARCHAR(255) NOT NULL UNIQUE,
  "authorized" BOOLEAN NOT NULL,
  "lastFromSortKey" VARCHAR(255),
  "interval" VARCHAR(255) NOT NULL,
  "block" JSONB NOT NULL,
  "createdAt" BIGINT NOT NULL
);