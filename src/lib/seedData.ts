import { Contact } from '../types';

export const GLOBAL_CONTACTS: Partial<Contact>[] = [
  // VENDORS - Audio
  { name: 'Trew Audio', phone: '(323)-876-7525', roles: ['Vendor', 'Audio Equipment'], location: 'Burbank, CA', notes: '2243 N Hollywood Way. https://www.trewaudio.com', isGlobal: true, reliability: 5 },
  { name: 'Location Sound', phone: '(818)-980-9891', roles: ['Vendor', 'Audio Equipment'], location: 'North Hollywood, CA', notes: '10639 Riverside Dr. www.locationsound.com/', isGlobal: true, reliability: 5 },
  
  // VENDORS - Camera
  { name: 'C Mount Industries', phone: '(310)-464-6888', roles: ['Vendor', 'Camera Equipment'], location: 'Van Nuys, CA', notes: '14141 Covello St #9a. www.cmountindustries.com', isGlobal: true, reliability: 5 },
  { name: 'Samys Camera', phone: '310-450-4551', roles: ['Vendor', 'Camera Equipment'], location: 'Culver City, CA', notes: '4411 Sepulveda Blvd. Purchases & Repairs. https://www.samys.com/', isGlobal: true, reliability: 5 },
  { name: "Samy's Rentals", phone: '323-938-4400', roles: ['Vendor', 'Camera Equipment'], location: 'Los Angeles, CA', notes: '431 S. Fairfax Ave. https://www.samys.com/rent', isGlobal: true, reliability: 5 },
  { name: 'Abelcine', phone: '(818) 972-9078', roles: ['Vendor', 'Camera Equipment'], location: 'Burbank, CA', notes: '801 South Main St. www.abelcine.com/', isGlobal: true, reliability: 5 },
  { name: 'The Camera Division', phone: '(818) 724-4824', roles: ['Vendor', 'Camera Equipment'], location: 'North Hollywood, CA', notes: '7351 Fulton Ave. https://thecameradivision.com/', isGlobal: true, reliability: 5 },
  { name: 'Cinema Camera Rentals', phone: '(310) 574-1524', roles: ['Vendor', 'Camera Equipment'], location: 'Culver City, CA', notes: '5799 Washington Blvd. www.cinemacamerarentals.com/', isGlobal: true, reliability: 5 },
  { name: '27 Notch', phone: '(323) 272-6996', roles: ['Vendor', 'Camera Equipment'], location: 'Los Angeles, CA', notes: '1438 N Gower St #103. 27notch.com/', isGlobal: true, reliability: 5 },
  { name: 'Keslow Camera', phone: '310.636.4600', roles: ['Vendor', 'Camera Equipment'], location: 'Culver City, CA', notes: '5900 Blackwelder St', isGlobal: true, reliability: 5 },
  { name: 'Stray Angel Films', phone: '(310) 277-6900', roles: ['Vendor', 'Camera Equipment'], location: 'Los Angeles, CA', notes: '11318 Santa Monica Blvd. www.strayangel.com', isGlobal: true, reliability: 5 },
  { name: 'Alternative Rentals', phone: '(310) 204-3388', roles: ['Vendor', 'Camera Equipment'], location: 'Los Angeles, CA', notes: '5805 W Jefferson Blvd. www.alternativerentals.com', isGlobal: true, reliability: 5 },
  { name: 'Pro HD Rentals', phone: '(818) 450-1115', roles: ['Vendor', 'Camera Equipment'], location: 'Burbank, CA', notes: '2201 N Hollywood Way #1. www.prohdrentals.com', isGlobal: true, reliability: 5 },

  // VENDORS - Costume
  { name: 'Eastern Costume Rentals', phone: '818.982-3611', roles: ['Vendor', 'Costume'], location: 'North Hollywood, CA', notes: '7243 Coldwater Canyon Ave.', isGlobal: true, reliability: 5 },
  { name: 'Universal Costume', phone: '(818) 777-2722', roles: ['Vendor', 'Costume'], location: 'North Hollywood, CA', notes: '100 Universal City Plaza. http://www.universalstudioslot.com/costume', isGlobal: true, reliability: 5 },
  { name: 'Western Costume', phone: '(818) 760-0900', roles: ['Vendor', 'Costume'], location: 'North Hollywood, CA', notes: '11401 Vanowen St. www.westerncostume.com/', isGlobal: true, reliability: 5 },

  // VENDORS - Lighting
  { name: 'Colt LEDs', phone: '661.977.0038', roles: ['Vendor', 'Lighting'], location: 'Santa Clarita, CA', notes: '28416 Constellation Rd. www.coltled.com/', isGlobal: true, reliability: 5 },
  { name: 'Wooden Nickel', phone: '(818) 761-9662', roles: ['Vendor', 'Lighting'], location: 'North Hollywood, CA', notes: '6920 Tujunga Ave. www.woodennickellighting.com', isGlobal: true, reliability: 5 },

  // VENDORS - Locations
  { name: 'Film LA', phone: '213.977.8600', roles: ['Vendor', 'Locations'], location: 'Los Angeles, CA', notes: '6255 W. Sunset Blvd. 12th Floor. www.filmla.com', isGlobal: true, reliability: 5 },
  { name: 'Film Permits Unlimited', phone: '818.347.9929', roles: ['Vendor', 'Locations'], location: 'Woodland Hills, CA', notes: '22025 Ventura Blvd. #101', isGlobal: true, reliability: 5 },

  // VENDORS - Props
  { name: 'Auditorium Props', phone: '877 732 7733', roles: ['Vendor', 'Props'], location: 'Sun Valley, CA', notes: '7684 Clybourn Ave. 2nd Floor. http://www.auditoriumprops.com', isGlobal: true, reliability: 5 },
  { name: 'EC Props', phone: '818.764.2008', roles: ['Vendor', 'Props'], location: 'North Hollywood, CA', notes: '11846 Sherman Way. www.ecprops.com', isGlobal: true, reliability: 5 },
  { name: 'Hand Prop Room', phone: '323.931.1534', roles: ['Vendor', 'Props'], location: 'Los Angeles, CA', notes: '5700 Venice Blvd. http://hpr.com', isGlobal: true, reliability: 5 },
  { name: 'LCW Props', phone: '818.243.0707', roles: ['Vendor', 'Props'], location: 'Glendale, CA', notes: '6439 San Fernando Rd. https://www.lcwprops.com', isGlobal: true, reliability: 5 },
  { name: 'Omega Cinema Props', phone: '323.466.8201', roles: ['Vendor', 'Props'], location: 'Los Angeles, CA', notes: '5857 Santa Monica Blvd. http://www.omegacinemaprops.com', isGlobal: true, reliability: 5 },
  { name: 'Prop Heaven', phone: '818.841.5882', roles: ['Vendor', 'Props'], location: 'Burbank, CA', notes: '3110 Winona Ave. http://www.propheaven.com', isGlobal: true, reliability: 5 },
  { name: 'Sony Studios Props Dept', phone: '310 244 5999', roles: ['Vendor', 'Props'], location: 'Culver City, CA', notes: '5933 W Slauson Ave', isGlobal: true, reliability: 5 },
  { name: 'Independent Studio Services', phone: '(818) 951-5600', roles: ['Vendor', 'Props'], location: 'Sunland, CA', notes: '9545 Wentworth St. http://issprops.com/', isGlobal: true, reliability: 5 },
  { name: 'History for Hire', phone: '(818) 765-7767', roles: ['Vendor', 'Props'], location: 'North Hollywood, CA', notes: '7149 fair Ave. http://www.historyforhire.com/', isGlobal: true, reliability: 5 },

  // VENDORS - Various
  { name: 'Galpin Studio Rentals', phone: '323.857.0111', roles: ['Vendor', 'Various Production'], location: 'Los Angeles, CA', isGlobal: true, reliability: 5 },
  { name: 'Quixote Studio Store', phone: '323.960. 9191', roles: ['Vendor', 'Various Production'], location: 'Los Angeles, CA', notes: '1000 N Cahuenga Blvd. http://www.expendables.com', isGlobal: true, reliability: 5 },
  { name: 'The Production Truck', phone: '818.459.0425', roles: ['Vendor', 'Various Production'], location: 'Burbank, CA', notes: '1120 Chestnut St. https://theproductiontruck.com/', isGlobal: true, reliability: 5 },
  { name: 'MBS Equipment Rentals', phone: '310.558.3100', roles: ['Vendor', 'Various Production'], location: 'Culver City, CA', notes: '9336 W. Washington Blvd. #2. http://mbsequipmentco.com', isGlobal: true, reliability: 5 },
  { name: 'Town and Country Event Rentals', phone: '818.908.4211', roles: ['Vendor', 'Vehicles'], location: 'Van Nuys, CA', isGlobal: true, reliability: 5 },

  // CREW
  { name: 'Mellisa Francisco', email: 'melissa@melissamartine.com', phone: '310.926.3484', roles: ['Assistant Camera'], location: 'Los Angeles, CA', notes: 'Bounce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Alexander Goens', email: 'alexgoens@gmail.com', phone: '626.678.4073', roles: ['Audio Technician'], location: 'Los Angeles, CA', notes: 'Bounce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Jacqueline Lehr', email: 'jqcquelinelehr098@gmail.com', phone: '415.250.8703', roles: ['Cam Op'], location: 'Los Angeles, CA', notes: 'Bounce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Cameron Schmucker', email: 'cameron.schmucker@gmail.com', phone: '214.458.1332', roles: ['Cam Op'], location: 'Los Angeles, CA', notes: 'Bounce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Gray Morison', email: 'grayareafilm@gmail.com', phone: '818.342.3117', roles: ['Cam Op', 'Gaffer'], location: 'Los Angeles, CA', notes: 'Challenge Squad Pilot, Look what you made me do Music Video, Bounce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Joseph Abesamis', email: 'jabesamis.put@gmail.com', phone: '661.493.9568', roles: ['Choregrapher'], location: 'Los Angeles, CA', notes: 'Back to School..', isGlobal: true, reliability: 5 },
  { name: 'Dale Allen', email: 'dale4allen@gmail.com', phone: '805.698.9314', roles: ['DP'], isGlobal: true, reliability: 5 },
  { name: 'Armin Balg', email: 'arm.balg@gmail.com', phone: '310.619.7625', roles: ['DP'], isGlobal: true, reliability: 5 },
  { name: 'Andrew (Luke) Dejoras', email: 'lukejdejoras@gmail.com', phone: '562.481.1672', roles: ['DP'], isGlobal: true, reliability: 5 },
  { name: 'Jan-Michael Del Mundo', email: 'mykee.delmundo@gmail.com', phone: '818.653.0809', roles: ['DP'], isGlobal: true, reliability: 5 },
  { name: 'Alana Fickes', email: 'alana.fickes@gmail.com', phone: '808.292.2564', roles: ['DP'], location: 'Los Angeles, CA', notes: 'Pop channel, regular shooter', isGlobal: true, reliability: 5 },
  { name: 'Alex Garcia', email: 'alexgarciaonline@gmail.com', phone: '323.243.4722', roles: ['DP'], isGlobal: true, reliability: 5 },
  { name: 'Brendon Harris', email: 'brendon.jay.harris@gmail.com', phone: '601.993.4645', roles: ['DP'], isGlobal: true, reliability: 5 },
  { name: 'Molly Becker', email: 'molly.k.becker@gmail.com', phone: '650.619.8953', roles: ['DP'], location: 'Los Angeles, CA', notes: 'MAIN SHOOTER-Tween Channel, Challenge Squad Pilot, Look what you made me do Music Video, Bounce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Trent Turner', email: 'trent.t.turner@gmail.com', phone: '217.415.6808', roles: ['Grips'], location: 'Los Angeles, CA', notes: 'Bounce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Timothy Beggy', email: 'timbeggy@gmail.com', phone: '213.949.7745', roles: ['Game Producer'], location: 'Los Angeles, CA', notes: 'Bounce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Michael Baker', email: 'MBKR111@gmail.com', phone: '661.317.7092', roles: ['Set Medic'], location: 'Los Angeles, CA', notes: 'Bounce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Stella Pacific', email: 'stellapacific@yahoo.com', phone: '818.464.5425', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel, Bouncce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Charmaine Boos', email: 'cdboos@dslextreme.com', phone: '818.222.2090', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'Jan Citron', email: 'jancitron@aol.com', phone: '310.360.9507', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'Elizabeth Fors', email: 'libbyfors@gmail.com', phone: '303.775.0776', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'Terri Ganey', email: 'drterriganey@gmail.com', phone: '239.872.8915', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'Dena Gimshaw', email: 'denagrimshaw@gmail.com', phone: '818.634.3526', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'Clifford Hirsch', email: 'gladys222@aol.com', phone: '805.573.9442', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'Alicia Kalvin', email: 'abkalvin@msn.com', phone: '310.980.0290', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'Samuel Kline', email: 'studioteachersam@gmail.com', phone: '310.403.3865', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'Thomas Porter', email: 'thomasdporter@yahoo.com', phone: '818.237.7875', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'Amy Stanoszek', email: 'amystanoszek@yahoo.com', phone: '714.612.7323', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel, Bouncce with Ryan', isGlobal: true, reliability: 5 },
  { name: 'Jack Stern', email: 'professorace@yahoo.com', phone: '818.970.7540', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },
  { name: 'G.Maximilian Zarou', email: 'maxzarou@gmail.com', phone: '310.801.6692', roles: ['Studio Teacher'], location: 'Los Angeles, CA', notes: 'Pop Channel', isGlobal: true, reliability: 5 },

  // PAs
  { name: 'Teri Andony', email: 'teri.andony@gmail.com', phone: '720.260.7096', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Organizing, Producing, Camera, AD', isGlobal: true, reliability: 5 },
  { name: 'Andrea Behm', email: 'andrealbehm@gmail.com', phone: '847.347.5446', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Works really fast', isGlobal: true, reliability: 5 },
  { name: 'Sara Bernal', email: 'sarabernal2016@gmail.com', phone: '310.782.4139', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Previously an intern for pw', isGlobal: true, reliability: 5 },
  { name: 'Rich Boyle', email: 'rich@justonepush.com', phone: '267.738.2812', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Producing, Can drive anything', isGlobal: true, reliability: 5 },
  { name: 'Adam Cardozo', email: 'Adam.Cardozo@pocket.watch', phone: '720.891.9551', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Art, Sound, Currently w/ CSQ', isGlobal: true, reliability: 5 },
  { name: 'Natasha Estrada', email: 'natashamestrada@gmail.com', phone: '323.336.1221', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Art, Producing', isGlobal: true, reliability: 5 },
  { name: 'Jackie Gerhardy', email: 'jackiegthatsme@gmail.com', phone: '269.274.7356', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Producing, Stunts', isGlobal: true, reliability: 5 },
  { name: 'Petey Gibson', email: 'peteygibson@gmail.com', phone: '617.875.9522', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Kids', isGlobal: true, reliability: 5 },
  { name: 'Vanessa Gritton', email: 'jvanessagritton@gmail.com', phone: '714.499.2708', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Writer, Producing', isGlobal: true, reliability: 5 },
  { name: 'Sami Hall', email: 'hall.samiyah@gmail.com', phone: '310.213.1381', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Has been an intern', isGlobal: true, reliability: 5 },
  { name: 'Lily Hardy', email: 'lilydarraghharty@gmail.com', phone: '914.419.7769', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Organizing, Currently w/ Studio Ops', isGlobal: true, reliability: 5 },
  { name: 'Liz Lipschultz', email: 'liz.lipschultz@gmail.com', phone: '862.438.0093', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Self starter', isGlobal: true, reliability: 5 },
  { name: 'Ebony McClain', email: 'ebonyrmcclain@gmail.com', phone: '603.731.2165', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Really good scripty', isGlobal: true, reliability: 5 },
  { name: 'Paige McCall', email: 'paigeleamccall@gmail.com', phone: '425.463.8765', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Albie contact/suggested', isGlobal: true, reliability: 5 },
  { name: 'Kendra Pasternak', email: 'pasternakkendra@gmail.com', phone: '774.644.6943', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Self starter', isGlobal: true, reliability: 5 },
  { name: 'Grace Presse', email: 'gracepresse@gmail.com', phone: '323.698.2435', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Writing, Producing, AD', isGlobal: true, reliability: 5 },
  { name: 'James Procelli', email: 'jprocelli2@yahoo.com', phone: '317.358.6120', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Worked with MarMar', isGlobal: true, reliability: 5 },
  { name: 'Gavin Reidenauer', email: 'Gavin.Reidenauer@pocket.watch', phone: '973.270.4929', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Writing, Sound, Currently with CSQ', isGlobal: true, reliability: 5 },
  { name: 'Chris Schwartz', email: 'cschwartzjr@yahoo.com', phone: '303.908.0059', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Producing, Has worked w/ MarMar, CSQ, & logged', isGlobal: true, reliability: 5 },
  { name: 'Gabby Ruiz', email: 'gabrielaruiz3193@gmail.com', phone: '818.679.8989', roles: ['Production Assistant'], location: 'Los Angeles, CA', isGlobal: true, reliability: 5 },
  { name: 'Amanda Jean Shaw', email: 'amandajeanmodel@gmail.com', phone: '412.508.9866', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Producing, Organizing', isGlobal: true, reliability: 5 },
  { name: 'Javier Scott', email: 'scott.javier94@gmail.com', phone: '401.615.1767', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Writing, Art', isGlobal: true, reliability: 5 },
  { name: 'Sam Stagg', email: 'samrstagg@gmail.com', phone: '410.507.8452', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Sound, Currently w/ HSL', isGlobal: true, reliability: 5 },
  { name: 'Nicole Villela', email: 'nicole1villela@gmail.com', phone: '310.940.4107', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Makes content that goes viral', isGlobal: true, reliability: 5 },
  { name: 'Trevor Waggoner', email: 'TrevWagg93@yahoo.com', phone: '480.544.9223', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Coordinator Experince', isGlobal: true, reliability: 5 },
  { name: 'Casey Weeks', email: 'casey.a.weeks@icloud.com', phone: '541.292.7671', roles: ['Production Assistant'], location: 'Los Angeles, CA', notes: 'Literaly can put a new engine in your car, can fix anything, Stunts', isGlobal: true, reliability: 5 }
];
