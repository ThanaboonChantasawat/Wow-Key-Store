import Image from "next/image";

const Hero = () => {
  return (
    <section className="bg-[#111111] text-white">
      <div className="w-full h-[800px] overflow-hidden">
        <Image
          src="/landscape-placeholder-svgrepo-com.svg"
          alt=""
          width={1000}
          height={800}
          className="w-full h-full object-none"
        />
      </div>
    </section>
  );
};
export default Hero;
