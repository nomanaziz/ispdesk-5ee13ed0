export const formatBDT = (n: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n || 0);

export const BD_DISTRICTS = [
  "Bagerhat","Bandarban","Barguna","Barishal","Bhola","Bogura","Brahmanbaria","Chandpur",
  "Chapainawabganj","Chattogram","Chuadanga","Cox's Bazar","Cumilla","Dhaka","Dinajpur",
  "Faridpur","Feni","Gaibandha","Gazipur","Gopalganj","Habiganj","Jamalpur","Jashore",
  "Jhalokati","Jhenaidah","Joypurhat","Khagrachari","Khulna","Kishoreganj","Kurigram",
  "Kushtia","Lakshmipur","Lalmonirhat","Madaripur","Magura","Manikganj","Meherpur",
  "Moulvibazar","Munshiganj","Mymensingh","Naogaon","Narail","Narayanganj","Narsingdi",
  "Natore","Netrokona","Nilphamari","Noakhali","Pabna","Panchagarh","Patuakhali","Pirojpur",
  "Rajbari","Rajshahi","Rangamati","Rangpur","Satkhira","Shariatpur","Sherpur","Sirajganj",
  "Sunamganj","Sylhet","Tangail","Thakurgaon",
];

export const isInsideDhaka = (district: string) => district?.trim().toLowerCase() === "dhaka";

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
