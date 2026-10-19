/**
 * Admin check for the new handlers, as blog/create does it: the session says
 * who is logged in, the database says whether that account is an admin.
 */

/** true for an admin; otherwise writes 401/403, ends the script and returns false. */
function requireAdmin(mars) {
  const deny = (status, message) => {
    mars.status(status);
    mars.write('message', message);
    mars.exit();
    return false;
  };
  const user = mars.session('user');
  if (!user) return deny(401, 'Not Authorized');
  if (!user.kor_admin || !user.kor_email) return deny(403, 'Samo za administratora.');
  const rows = mars.query('SELECT kor_id FROM korisnik WHERE kor_email = ? AND kor_admin = 1 LIMIT 1', user.kor_email);
  if (!rows || !rows.length) return deny(403, 'Samo za administratora.');
  return true;
}

module.exports = { requireAdmin };
