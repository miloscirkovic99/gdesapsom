module.exports = (MARSModules) => {
with (MARSModules) {
let lon = param('lon', null);
let lat = param('lat', null);
let radius = param('radius', 2000);

let sqlQuery = `
  SELECT *,
    (6371000 * ACOS(
      COS(RADIANS(:lat)) * COS(RADIANS(latitude)) *
      COS(RADIANS(longitude) - RADIANS(:lon)) +
      SIN(RADIANS(:lat)) * SIN(RADIANS(latitude))
    )) AS distance_m
  FROM info_ug_obj
  WHERE iuo_obrisan IS NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND (6371000 * ACOS(
      COS(RADIANS(:lat)) * COS(RADIANS(latitude)) *
      COS(RADIANS(longitude) - RADIANS(:lon)) +
      SIN(RADIANS(:lat)) * SIN(RADIANS(latitude))
    )) <= :radius
  ORDER BY distance_m ASC
`;

let sqlQueryResult = db.query(sqlQuery, { lat, lon, radius });

write("nearMe", sqlQueryResult);
}
}