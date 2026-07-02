import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import ServiceBar from '@/components/ServiceBar';
import MenuSection from '@/components/MenuSection';
import FeatureCallout from '@/components/FeatureCallout';
import DeliverySection from '@/components/DeliverySection';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';
import AiChat from '@/components/AiChat';
import FloatingCart from '@/components/FloatingCart';
import CartDock from '@/components/CartDock';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <ServiceBar />
        <MenuSection />
        <FeatureCallout />
        <DeliverySection />
        <Testimonials />
      </main>
      <Footer />
      <FloatingCart />
      <CartDock />
      <AiChat />
    </>
  );
}
