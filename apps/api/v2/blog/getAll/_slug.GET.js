module.exports = (MARSModules) => {
with (MARSModules) {
let slug = param('slug', null);

let sqlQuery = `
SELECT 
  p.id                AS post_id,
  p.naslov,
  p.slug,
  p.sadrzaj,
  p.slika_naslovna,
  p.status,
  p.objavljen_u,

  k.kor_id,
  k.kor_ime           AS autor,
  k.kor_email         AS autor_email,

  c.id                AS kategorija_id,
  c.naziv             AS kategorija,

  GROUP_CONCAT(DISTINCT t.id 
    ORDER BY t.naziv 
    SEPARATOR ',')     AS tag_ids,
  GROUP_CONCAT(DISTINCT t.naziv 
    ORDER BY t.naziv 
    SEPARATOR ', ')    AS tagovi,

  COUNT(DISTINCT com.id) AS broj_komentara

FROM posts p
LEFT JOIN korisnik   k   ON p.autor_id      = k.kor_id
LEFT JOIN categories c   ON p.kategorija_id = c.id
LEFT JOIN post_tags  pt  ON p.id            = pt.post_id
LEFT JOIN tags       t   ON pt.tag_id       = t.id
LEFT JOIN comments   com ON p.id            = com.post_id AND com.odobren = TRUE

WHERE p.slug = ?
  AND p.status = 'objavljen'

GROUP BY 
  p.id, p.naslov, p.slug, p.sadrzaj, p.slika_naslovna, p.status, p.objavljen_u,
  k.kor_id, k.kor_ime, k.kor_email,
  c.id, c.naziv`;

let sqlQueryResult = db.query(sqlQuery, slug);
write("blogPostSingle", sqlQueryResult);
}
}