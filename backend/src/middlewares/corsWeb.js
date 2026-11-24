export const corsWeb = (origenes) => (req, res, next) => {
  const origen = req.get("Origin");
  res.vary("Origin");
  if (!origenes.includes(origen)) return next();

  res.set("Access-Control-Allow-Origin", origen);
  if (req.method !== "OPTIONS" || !req.get("Access-Control-Request-Method")) return next();

  res.set("Access-Control-Allow-Methods", "GET, POST, PATCH");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
};
