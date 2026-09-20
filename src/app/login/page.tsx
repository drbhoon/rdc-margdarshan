import Image from "next/image";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = Boolean((await searchParams).error);
  return (
    <main className="coach" style={{ paddingTop: 48 }}>
      <div className="grid" style={{ alignItems: "center", gap: 40 }}>
        <section>
          <p className="muted">RDC CONCRETE · LEARN TOGETHER</p>
          <h1 style={{ fontSize: "clamp(36px,5vw,58px)", margin: "16px 0" }}>
            Your potential.
            <br />
            Our shared journey.
          </h1>
          <p style={{ fontSize: 20 }}>
            Margdarshan <span lang="hi">मार्गदर्शन</span>
          </p>
          <p style={{ margin: "20px 0" }}>
            A place for Graduate Engineer Trainees and mentors to learn from
            experience, build confidence and turn ambitions into progress.
          </p>
          <p lang="hi">
            अनुभव से सीखें, आत्मविश्वास बढ़ाएँ और अपनी मेंटरिंग यात्रा को
            सहेजें।
          </p>
          {error && (
            <p role="alert" className="notice error">
              Sign-in could not be completed. Use your RDC Google Workspace
              account and try again.
            </p>
          )}
          <p style={{ margin: "28px 0" }}>
            <a className="button" href="/api/auth/google">
              Sign in with Google · साइन इन करें
            </a>
          </p>
          <p className="muted">
            For verified @rdc.in Google accounts. Saved records are visible to
            both participants and administrators. Use off-record mode to pause
            saving.
          </p>
        </section>
        <figure>
          <Image
            src="/images/women-engineers.jpg"
            alt="Mentor and mentee engineers wearing hard hats and reflective vests"
            width={1200}
            height={900}
            priority
            style={{ borderRadius: 24, width: "100%", height: "auto" }}
          />
          <figcaption className="muted" style={{ marginTop: 8 }}>
            Learning together. Growing with confidence.
          </figcaption>
        </figure>
      </div>
      <p className="muted" style={{ marginTop: 40, fontSize: 12 }}>
        Illustrative stock photography: Kindel Media / Pexels. People shown are
        not identified as RDC employees.
      </p>
    </main>
  );
}
