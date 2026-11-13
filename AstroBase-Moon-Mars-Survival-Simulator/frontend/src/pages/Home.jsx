import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import MissionOverview from "../components/MissionOverview";
import HowItWorks from "../components/HowItWorks";
import About from "../components/About";
import Footer from "../components/Footer";

function Home() {
  return (
    <main className="home-page">
      <Navbar />

      <Hero />

      <MissionOverview />

      <HowItWorks />

      <About />

      <Footer />
    </main>
  );
}

export default Home;