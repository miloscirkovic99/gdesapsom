export interface Post {
  post_id: number;
  naslov: string;
  slug: string;
  sadrzaj: string;
  slika_naslovna: string;
  status: string;
  objavljen_u: string;
  kor_id: number;
  autor: string;
  autor_email: string;
  kategorija: string;
  tagovi: string;
  broj_komentara: number;
}