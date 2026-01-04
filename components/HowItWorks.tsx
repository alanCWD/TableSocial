
import React from 'react';

export const HowItWorks: React.FC = () => {
  return (
    <div className="bg-[#faf9f6]">
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <h2 className="text-accent font-bold uppercase tracking-[0.4em] text-xs mb-6">The Journey</h2>
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-culinary mb-8">How TableSocial Works</h1>
        <p className="text-gray-500 text-lg font-light leading-relaxed">
          From the first spark of curiosity to the last bite of dessert, we've designed an experience built for connection.
        </p>
      </section>

      <section className="pb-32 px-6 max-w-6xl mx-auto">
        <div className="space-y-32">
          {/* Step 1 */}
          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="md:w-1/2">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center font-serif text-3xl font-bold mb-8">1</div>
              <h3 className="text-4xl font-serif font-bold text-culinary mb-6">Discovery Through Curation</h3>
              <p className="text-gray-500 text-lg font-light leading-relaxed">
                Browse our real-time list of upcoming private events. Our AI scouts Google Events, social media, and local postings to ensure you never miss a secret pop-up or chef pairing in your city.
              </p>
            </div>
            <div className="md:w-1/2">
              <img src="https://images.unsplash.com/photo-1550966841-3ee7adac1af0?auto=format&fit=crop&q=80&w=800" className="rounded-[3rem] shadow-xl" alt="Search" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-20">
            <div className="md:w-1/2">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center font-serif text-3xl font-bold mb-8">2</div>
              <h3 className="text-4xl font-serif font-bold text-culinary mb-6">Know Your Host</h3>
              <p className="text-gray-500 text-lg font-light leading-relaxed">
                Dive deep into the Chef's story. View their past events, culinary philosophy, and social presence. At TableSocial, the Chef is more than a name on the menu—they are the narrator of your evening.
              </p>
            </div>
            <div className="md:w-1/2">
              <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800" className="rounded-[3rem] shadow-xl" alt="Chef Profile" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="md:w-1/2">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center font-serif text-3xl font-bold mb-8">3</div>
              <h3 className="text-4xl font-serif font-bold text-culinary mb-6">The Communal Table</h3>
              <p className="text-gray-500 text-lg font-light leading-relaxed">
                Book your seat and prepare for a shared ritual. These aren't isolated restaurant experiences; they are intimate gatherings of strangers united by food, designed for conversation and discovery.
              </p>
            </div>
            <div className="md:w-1/2">
              <img src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800" className="rounded-[3rem] shadow-xl" alt="Communal Dining" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
