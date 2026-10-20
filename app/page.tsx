import Orbit from "../components/sections/OrbitGallery";

export default function HomePage() {
  return (
    <>
      <section className="orbit-section">
        <Orbit video={{ mp4: "/videos/hero.mp4" }} />
      </section>
    </>
  );
}