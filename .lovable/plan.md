
## সমস্যা

Website-এর উপরে yellow scrolling bar ("Eid Mubarak wishes... charge helpline...") দেখা যাচ্ছে — কিন্তু সেটা DB-র active notice না হলেও দেখাচ্ছে।

## খুঁজে বের করা দরকার

`Home.tsx` বা `PublicLayout`-এ কোথায় এই scrolling marquee আসছে — `client_notices` থেকে কিনা, নাকি hardcoded।
