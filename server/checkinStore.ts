// Legacy unverified records are isolated, not destructively deleted.
export const RECORDS = 'checkins:v2'
export const INDEX = 'checkins:v2:updated'
export const RETENTION_MS = 183 * 24 * 60 * 60 * 1000
export const MAX_RECORDS = 5000
export const PAGE_SIZE = 100

export const QUOTA_SCRIPT = `
local ip = redis.call('INCR', KEYS[1])
if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], 3600) end
if ip > 30 then return 0 end
local global = redis.call('INCR', KEYS[2])
if redis.call('TTL', KEYS[2]) < 0 then redis.call('EXPIRE', KEYS[2], 3600) end
if global > 1000 then return 0 end
return 1
`

export const VOTE_SCRIPT = `
local now = tonumber(ARGV[1])
local expired = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', now - tonumber(ARGV[2]), 'LIMIT', 0, 100)
for _, id in ipairs(expired) do
  redis.call('HDEL', KEYS[1], id)
  redis.call('ZREM', KEYS[2], id)
end
if redis.call('EXISTS', KEYS[3]) == 1 then return {'duplicate'} end
local old = redis.call('HGET', KEYS[1], ARGV[3])
if not old and redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[7]) then return {'full'} end
local rec = {ok=0, gone=0, lastOk=cjson.null, lastGone=cjson.null, lon=tonumber(ARGV[5]), lat=tonumber(ARGV[6]), recentOk=0, recentGone=0}
if old then rec = cjson.decode(old) end
if not rec.windowStart or now - rec.windowStart > 604800000 then
  rec.windowStart = now
  rec.recentOk = 0
  rec.recentGone = 0
end
if ARGV[4] == 'ok' then
  rec.ok = rec.ok + 1
  rec.recentOk = rec.recentOk + 1
  rec.lastOk = now
else
  rec.gone = rec.gone + 1
  rec.recentGone = rec.recentGone + 1
  rec.lastGone = now
end
rec.lon = tonumber(ARGV[5])
rec.lat = tonumber(ARGV[6])
rec.goneVerified = rec.recentGone >= 2 and rec.recentGone > rec.recentOk
local value = cjson.encode(rec)
redis.call('HSET', KEYS[1], ARGV[3], value)
redis.call('ZADD', KEYS[2], now, ARGV[3])
redis.call('SET', KEYS[3], '1', 'EX', 604800)
return {'ok', value}
`
