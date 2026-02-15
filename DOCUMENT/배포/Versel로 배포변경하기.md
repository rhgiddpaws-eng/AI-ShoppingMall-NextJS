# Vercel로 배포 변경하기 (아주 쉬운 가이드 🐣)

이 프로젝트를 내 컴퓨터(Docker)에서 인터넷 세상(Vercel)으로 이사시키는 방법이에요!
유치원생도 따라 할 수 있게 차근차근 설명해 드릴게요.

---

## 1. 준비물 챙기기 🎒 (이사 갈 집 구하기)

우리가 집(내 컴퓨터)에서 쓰던 **데이터베이스(DB)**는 너무 무거워서 Vercel 비행기에 못 실어요.
그래서 인터넷에 있는 **Supabase**라는 무료 창고를 빌려야 해요.

### 1단계: Supabase 가입하고 창고 만들기
1. [Supabase](https://supabase.com/) 사이트에 가서 가입(Sign up) 버튼을 눌러요.
2. **New Project** 버튼을 눌러서 새 창고를 만들어요.
3. **Database Password(비밀번호)**를 만들고 **메모장에 꼭 적어주세요!** (절대 까먹으면 안 돼요 📝)
4. 잠시 기다리면 초록불이 들어오며 창고가 완성돼요.
5. **Project Settings (톱니바퀴) > Database** 메뉴로 가요.
6. `Connection String`이라는 곳에서 **URI** 탭을 누르고 주소를 복사해요.
   - 주소는 이렇게 생겼어요: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres`
   - `[YOUR-PASSWORD]`라고 된 부분을 아까 적어둔 비밀번호로 바꿔주세요.

---

## 2. 코드 수정하기 🛠️ (이사 준비)

이제 우리 코드에게 "새 창고(Supabase)를 쓸 거야"라고 알려줘야 해요.

### 2단계: 프리즈마(Prisma) 설정하기
1. 프로젝트에서 `prisma/schema.prisma` 파일을 열어요.
2. `datasource db` 부분을 찾아서 **directUrl** 한 줄을 추가해주면 더 튼튼해져요! (추천 👍)
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")  // 이 줄을 추가하면 좋아요!
     extensions = [vector]          // 이건 원래 있던 거에요
   }
   ```
   *(이걸 추가했다면, Vercel 환경변수에도 `DIRECT_URL`을 따로 넣어줘야 해요. 1단계 주소에서 포트만 5432로 쓴 게 directUrl이고, 6543을 쓴 게 url이에요.)*

3. **중요!** 터미널을 열고 명령어를 쳐서 새 창고(Supabase)에 선반을 설치해야 해요.
   ```bash
   # 내 컴퓨터 .env 파일의 DATABASE_URL을 잠시 Supabase 주소로 바꾸고 실행해요
   npx prisma db push
   ```
   *주의: 이 명령어를 치면 Supabase DB에 테이블들이 쫘아악 만들어져요!*

---

## 3. Vercel로 이사 가기 🚀 (비행기 타기)

이제 진짜 이사를 가볼까요?

### 3단계: Vercel에 프로젝트 올리기
1. [Vercel](https://vercel.com/) 사이트에 로그인해요.
2. **Add New... > Project** 버튼을 눌러요.
3. 내 깃허브(GitHub)에 있는 쇼핑몰 프로젝트를 찾아서 **Import** 버튼을 눌러요.

### 4단계: 비밀지도(환경변수) 건네주기 (가장 중요! ⭐⭐⭐)
내 컴퓨터 `.env` 파일에 있는 비밀번호들을 Vercel에게도 알려줘야 해요. 안 그러면 쇼핑몰이 작동을 안 해요!

1. Vercel 화면에서 **Environment Variables** (환경 변수) 글씨를 찾아서 눌러요.
2. 내 컴퓨터 `.env` 파일을 열고 하나씩 복사해서 넣어줘요.
   
   | 이름 (Key)          | 값 (Value)         | 설명                                                                         |
   | :------------------ | :----------------- | :--------------------------------------------------------------------------- |
   | **DATABASE_URL**    | `postgresql://...` | 아까 만든 Supabase 주소 (Transaction Mode 권장: 포트 6543)                   |
   | **DIRECT_URL**      | `postgresql://...` | Supabase 주소 (Session Mode: 포트 5432) - *schema.prisma에 추가했다면 필수!* |
   | **NEXT_PUBLIC_...** | `https://...`      | CDN 주소, 카카오 키 등 .env에 있는 거 전부!                                  |
   | **AUTH_SECRET**     | `...`              | 로그인 비밀키 등                                                             |

3. 다 넣었으면 **Add** 버튼을 꼭 눌러주세요.

---

## 4. 마지막 관문: Nginx랑 Docker는요? 🤔

- **쿨하게 잊어버리세요!** 👋
- Vercel이 Nginx보다 훨씬 똑똑한 경비원 역할을 알아서 다 해줘요. (`https` 자물쇠도 자동으로 달아줘요!)
- 프로젝트 안에 `Dockerfile`이나 `docker-compose` 폴더가 있어도, Vercel은 "아 이건 내 거 아니네" 하고 알아서 무시하니까 지우지 않아도 괜찮아요.

---

## 5. 배포 버튼 누르기 🎉

1. 모든 설정이 끝났다면 **Deploy** 버튼을 꾹 눌러요.
2. 화면에 폭죽이 터지면 배포 성공! 🎊
3. 이제 주소창에 나오는 URL로 전 세계 친구들에게 자랑하면 돼요! 🌍
