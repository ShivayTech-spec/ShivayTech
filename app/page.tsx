import Orbit from "../components/sections/OrbitGallery";
import Service from "../components/sections/services";
// import Work from "../components/sections/our-work";
import Why from "../components/sections/why-us";
import Testimonials from "../components/sections/testimonials";
import CTA from "../components/sections/cta";

export default function HomePage() {
  return (
    <>
      <section className="orbit-section">
       <Orbit centerVideo="/videos/hero.mp4" />
      </section>

      <section className="service-section">
        <Service/>
      </section>

        {/* <section className="work-section">
        <Work/>
      </section> */}

        <section className="why-us-section">
        <Why/>
      </section>

        <section className="testimonials-section">
        <Testimonials/>
      </section>

        <section className="cta-section">
        <CTA/>
      </section>
    </>
  );
}