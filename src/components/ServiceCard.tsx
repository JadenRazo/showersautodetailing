import { useState, useEffect } from 'react';

interface PackageData {
  id: number;
  name: string;
  description: string;
  features: string[];
  base_price: number;
  vehicle_multipliers: {
    sedan: number;
    suv: number;
    truck: number;
  };
}

interface Props {
  package: PackageData;
}

export default function ServiceCard({ package: pkg }: Props) {
  const [selectedVehicle, setSelectedVehicle] = useState<'sedan' | 'suv' | 'truck'>('sedan');
  const [price, setPrice] = useState(pkg.base_price);

  useEffect(() => {
    const multiplier = pkg.vehicle_multipliers[selectedVehicle] || 1;
    setPrice(pkg.base_price * multiplier);
  }, [selectedVehicle, pkg]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className={`p-6 ${
        pkg.name === 'Platinum' ? 'gradient-primary text-white' :
        pkg.name === 'Premium' ? 'bg-indigo-100 text-indigo-900' :
        'bg-gray-100 text-gray-900'
      }`}>
        <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
        <p className={pkg.name === 'Platinum' ? 'text-indigo-100' : 'text-gray-600'}>
          {pkg.description}
        </p>
      </div>

      {/* Price */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900">${price.toFixed(2)}</span>
          <span className="text-gray-500">/ service</span>
        </div>

        {/* Vehicle Type Selector */}
        <div className="mt-4 flex gap-2">
          {(['sedan', 'suv', 'truck'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedVehicle(type)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedVehicle === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="p-6">
        <ul className="space-y-3">
          {pkg.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <div className="p-6 pt-0">
        <a
          href={`#book?package=${pkg.id}`}
          className={`block w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors ${
            pkg.name === 'Platinum'
              ? 'gradient-primary text-white hover:opacity-90'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          Choose {pkg.name}
        </a>
      </div>
    </div>
  );
}
