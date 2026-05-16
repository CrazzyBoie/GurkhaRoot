import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Truck, Check, Smartphone, LogIn, Zap, Clock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useCartStore, useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ordersApi, userApi, paymentApi, shippingApi } from '@/services/api';
import { toast } from 'sonner';

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY && !STRIPE_KEY.includes('your_stripe')
  ? loadStripe(STRIPE_KEY)
  : null;

const METHOD_ICONS: Record<string, React.ReactNode> = {
  standard: <Truck className="w-4 h-4" />,
  express: <Zap className="w-4 h-4" />,
  overnight: <Clock className="w-4 h-4" />,
};

// ─── Inner payment form ───────────────────────────────────────────────────────
function StripePaymentForm({
  total,
  clientSecret,
  onSuccess,
  isLoading,
  setIsLoading,
  paymentMethod,
}: {
  total: number;
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  paymentMethod: 'stripe' | 'google_pay';
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [gpayAvailable, setGpayAvailable] = useState(false);

  useEffect(() => {
    if (!stripe) return;
    const pr = stripe.paymentRequest({
      country: 'NZ',
      currency: 'nzd',
      total: { label: 'Gurkha Roots Order', amount: Math.round(total * 100) },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result?.googlePay || result?.applePay) {
        setPaymentRequest(pr);
        setGpayAvailable(true);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      if (!stripe || !clientSecret) { ev.complete('fail'); return; }
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false },
      );
      if (error) {
        ev.complete('fail');
      } else {
        ev.complete('success');
        if (paymentIntent?.status === 'succeeded') {
          onSuccess(paymentIntent.id);
        } else if (paymentIntent?.status === 'requires_action') {
          const { error: actionError, paymentIntent: confirmedPI } = await stripe.confirmCardPayment(clientSecret);
          if (!actionError && confirmedPI?.status === 'succeeded') {
            onSuccess(confirmedPI.id);
          }
        }
      }
    });
  }, [stripe, total, clientSecret]);

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation`,
        },
        redirect: 'if_required',
      });
      
      if (error) {
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (paymentMethod === 'google_pay') {
    return (
      <div className="space-y-4">
        {gpayAvailable && paymentRequest ? (
          <>
            <p className="text-sm text-[#888]">Click below to pay with Google Pay</p>
            <PaymentRequestButtonElement
              options={{ paymentRequest, style: { paymentRequestButton: { height: '48px' } } }}
            />
          </>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            Google Pay is not available on this device/browser. Please use card payment.
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleCardSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={isLoading || !stripe}
        className="w-full bg-[#c8a96e] text-[#1a1a1a] hover:bg-[#b8985e]"
      >
        {isLoading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
      </Button>
    </form>
  );
}

// ─── Main Checkout component ───────────────────────────────────────────────────
export function Checkout() {
  const { items, getTotal, couponCode, discount, giftWrap, giftNote, clearCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [shippingMethod, setShippingMethod] = useState<string>('standard');
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string>('');

  const scrollToTop = () => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
  };
  
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'google_pay'>('stripe');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  // Guest fields
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName] = useState('');

  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: 'Auckland',
    country: 'NZ',
    postalCode: '',
  });

  const [postcodeLookupStatus, setPostcodeLookupStatus] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');

  // Global postcode lookup using Nominatim (OpenStreetMap) — covers every country
  useEffect(() => {
    const postcode = shippingAddress.postalCode.trim();
    if (postcode.length < 3) {
      setPostcodeLookupStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setPostcodeLookupStatus('loading');
      try {
        // If a country is already selected, scope the lookup to that country so
        // ambiguous postcodes (e.g. 8042 exists in both NZ and CH) resolve correctly.
        const selectedCountry = shippingAddress.country?.toLowerCase();
        const countryParam = selectedCountry ? `&countrycodes=${encodeURIComponent(selectedCountry)}` : '';
        const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postcode)}${countryParam}&format=json&addressdetails=1&limit=1`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'GurkhaRoots-Checkout/1.0' },
        });
        if (!res.ok) throw new Error('fetch failed');
        const results = await res.json();
        if (!results.length) throw new Error('not found');

        const addr = results[0].address;
        // Extract city — Nominatim uses different keys per country
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.suburb ||
          addr.municipality ||
          addr.hamlet ||
          '';
        // Extract state — Nominatim uses different keys per country
        const state =
          addr.state ||
          addr.region ||
          addr.province ||
          addr.county ||
          addr.state_district ||
          '';
        // Nominatim returns country_code as lowercase ISO2 — convert to uppercase
        const countryIso = (addr.country_code || '').toUpperCase();

        setShippingAddress(prev => ({
          ...prev,
          ...(city ? { city } : {}),
          ...(state ? { state } : {}),
          ...(countryIso ? { country: countryIso } : {}),
        }));
        setPostcodeLookupStatus('found');
      } catch {
        setPostcodeLookupStatus('notfound');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [shippingAddress.postalCode, shippingAddress.country]);

  // Load saved addresses
  useEffect(() => {
    if (isAuthenticated) {
      userApi.getAddresses()
        .then(res => {
          const addresses = res.data?.addresses || [];
          setSavedAddresses(addresses);
          const def = addresses.find((a: any) => a.isDefault);
          if (def) setSelectedAddressId(def.id);
        })
        .catch((err) => {
          console.error('Failed to load addresses:', err);
          setSavedAddresses([]);
        });
    }
  }, [isAuthenticated]);

  // Fetch shipping methods when country changes
  const fetchShippingMethods = useCallback(async (country: string) => {
    if (!country) return;
    setShippingLoading(true);
    setShippingError('');
    try {
      const res = await shippingApi.getMethods(country);
      console.log('Shipping API response:', res.data);
      
      // Handle different response structures
      const methods = res.data?.methods || res.data?.data?.methods || [];
      console.log('Parsed methods:', methods);
      
      setShippingMethods(methods);
      
      if (methods.length > 0) {
        // Pick first active method, or first method if none active
        const activeOnes = methods.filter((m: any) => m.active !== false);
        const defaultMethod = activeOnes[0] || methods[0];
        setShippingMethod(defaultMethod.id || defaultMethod.methodId || 'standard');
        setShippingCost(parseFloat(defaultMethod.cost) || 0);
      } else {
        setShippingMethod('standard');
        setShippingCost(0);
        setShippingError('No shipping methods available for this country');
      }
    } catch (err: any) {
      console.error('Shipping methods error:', err);
      setShippingMethods([]);
      setShippingError(err.response?.data?.message || 'Failed to load shipping methods');
      setShippingMethod('standard');
      setShippingCost(0);
    } finally {
      setShippingLoading(false);
    }
  }, []);

  // Trigger fetch when country changes (new address form)
  useEffect(() => {
    fetchShippingMethods(shippingAddress.country);
  }, [shippingAddress.country, fetchShippingMethods]);

  // Trigger fetch when saved address selected
  useEffect(() => {
    if (selectedAddressId && savedAddresses.length > 0) {
      const addr = savedAddresses.find((a: any) => a.id === selectedAddressId);
      if (addr?.country) {
        fetchShippingMethods(addr.country);
      }
    }
  }, [selectedAddressId, savedAddresses, fetchShippingMethods]);

  // Update cost when method changes
  useEffect(() => {
    const method = shippingMethods.find(m => (m.id || m.methodId) === shippingMethod);
    if (method) {
      setShippingCost(parseFloat(method.cost) || 0);
    }
  }, [shippingMethod, shippingMethods]);

  const subtotal = getTotal() + (giftWrap ? 5 : 0) + shippingCost;

  const buildOrderPayload = () => {
    const payload: any = {
      items: items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      paymentMethod,
      shippingMethod,
      giftWrap,
      giftNote: giftNote || undefined,
      shippingCost,
    };

    if (couponCode) payload.couponCode = couponCode;

    if (isAuthenticated && selectedAddressId) {
      payload.addressId = selectedAddressId;
    } else {
      payload.shippingAddress = shippingAddress;
    }

    if (!isAuthenticated) {
      payload.guestEmail = guestEmail;
      payload.guestName = guestName || shippingAddress.fullName.trim();
    }

    return payload;
  };

  const handleProceedToPayment = async () => {
    if (!stripePromise) {
      toast.error('Stripe is not configured');
      return;
    }
    setIsLoading(true);
    try {
      const orderPayload = buildOrderPayload();
      setPendingOrderData(orderPayload);

      const res = await paymentApi.createIntent(subtotal);
      setClientSecret(res.data.clientSecret);
      setStep(3);
      scrollToTop();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initialise payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setIsLoading(true);
    try {
      const orderPayload = { ...pendingOrderData, stripePayId: paymentIntentId };
      const response = await ordersApi.createOrder(orderPayload);
      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order-confirmation?orderNumber=${response.data.order.orderNumber}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-[#1a1a1a]">Your cart is empty.</p>
        <Link to="/shop" className="text-[#c8a96e] underline">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Header */}
      <div className="bg-[#1a1a1a] py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-[#f5f5f0]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            CHECKOUT
          </h1>

          {!isAuthenticated && (
            <div className="mt-4 flex items-center gap-3 text-[#c8a96e] text-sm">
              <LogIn className="w-4 h-4" />
              <span>Checking out as guest — <Link to="/login" className="underline">sign in</Link> to save your details</span>
            </div>
          )}

          <div className="flex items-center gap-4 mt-6">
            {[{ icon: <Truck className="w-4 h-4" />, label: 'Shipping' },
              { icon: <CreditCard className="w-4 h-4" />, label: 'Payment' },
              { icon: <Check className="w-4 h-4" />, label: 'Review' }].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= i + 1 ? 'bg-[#c8a96e] text-[#1a1a1a]' : 'bg-[#333] text-[#888]'}`}>
                  {s.icon}
                </div>
                <span className={`text-sm hidden sm:inline ${step >= i + 1 ? 'text-[#c8a96e]' : 'text-[#888]'}`}>{s.label}</span>
                {i < 2 && <div className="flex-1 h-px bg-[#333] w-8" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Main Content ── */}
          <div className="lg:col-span-2">

            {/* STEP 1 — Shipping */}
            {step === 1 && (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Shipping Address</h2>

                  {!isAuthenticated && (
                    <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-[#f5f5f0] rounded">
                      <div className="md:col-span-2">
                        <Label>Email address <span className="text-red-500">*</span></Label>
                        <Input
                          type="email"
                          value={guestEmail}
                          onChange={e => setGuestEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                        <p className="text-xs text-[#888] mt-1">Order confirmation will be sent here</p>
                      </div>
                    </div>
                  )}

                  {isAuthenticated && savedAddresses.length > 0 && (
                    <div className="mb-6">
                      <Label className="mb-2 block">Select a saved address</Label>
                      <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="space-y-2">
                        {savedAddresses.map((address) => (
                          <div key={address.id} className="flex items-center space-x-2 border p-3 rounded">
                            <RadioGroupItem value={address.id} id={address.id} />
                            <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                              <p className="font-medium">{address.fullName}</p>
                              <p className="text-sm text-[#888]">
                                {address.line1}, {address.city}, {address.state} {address.postalCode}
                              </p>
                              {address.isDefault && (
                                <span className="text-xs bg-[#c8a96e] text-[#1a1a1a] px-2 py-0.5 rounded">Default</span>
                              )}
                            </Label>
                          </div>
                        ))}
                        <div className="flex items-center space-x-2 border p-3 rounded">
                          <RadioGroupItem value="" id="new" />
                          <Label htmlFor="new" className="cursor-pointer">Use a new address</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {(!selectedAddressId || !isAuthenticated || savedAddresses.length === 0) && (
                    <div className="space-y-4">

                      {/* Row 1: Full Name */}
                      <div>
                        <Label>Full name <span className="text-red-500">*</span></Label>
                        <Input value={shippingAddress.fullName} onChange={e => setShippingAddress({ ...shippingAddress, fullName: e.target.value })} placeholder="John Doe" />
                      </div>

                      {/* Row 3: Country */}
                      <div>
                        <Label>Country / Region <span className="text-red-500">*</span></Label>
                        <select
                          value={shippingAddress.country}
                          onChange={e => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">-- Select Country --</option>
                          <option value="NZ">New Zealand</option>
                          <option value="AU">Australia</option>
                          <optgroup label="Pacific &amp; Asia">
                            <option value="FJ">Fiji</option>
                            <option value="WS">Samoa</option>
                            <option value="TO">Tonga</option>
                            <option value="VU">Vanuatu</option>
                            <option value="SB">Solomon Islands</option>
                            <option value="PG">Papua New Guinea</option>
                            <option value="NR">Nauru</option>
                            <option value="KI">Kiribati</option>
                            <option value="TV">Tuvalu</option>
                            <option value="PW">Palau</option>
                            <option value="MH">Marshall Islands</option>
                            <option value="FM">Micronesia</option>
                            <option value="CK">Cook Islands</option>
                            <option value="NP">Nepal</option>
                            <option value="IN">India</option>
                            <option value="SG">Singapore</option>
                            <option value="MY">Malaysia</option>
                            <option value="PH">Philippines</option>
                            <option value="ID">Indonesia</option>
                            <option value="TH">Thailand</option>
                            <option value="VN">Vietnam</option>
                            <option value="CN">China</option>
                            <option value="JP">Japan</option>
                            <option value="KR">South Korea</option>
                            <option value="HK">Hong Kong</option>
                            <option value="TW">Taiwan</option>
                            <option value="BD">Bangladesh</option>
                            <option value="PK">Pakistan</option>
                            <option value="LK">Sri Lanka</option>
                            <option value="MM">Myanmar</option>
                            <option value="KH">Cambodia</option>
                            <option value="LA">Laos</option>
                            <option value="BT">Bhutan</option>
                            <option value="MV">Maldives</option>
                            <option value="BN">Brunei</option>
                          </optgroup>
                          <optgroup label="Americas">
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="MX">Mexico</option>
                            <option value="BR">Brazil</option>
                            <option value="AR">Argentina</option>
                            <option value="CL">Chile</option>
                            <option value="CO">Colombia</option>
                            <option value="PE">Peru</option>
                            <option value="VE">Venezuela</option>
                            <option value="EC">Ecuador</option>
                            <option value="BO">Bolivia</option>
                            <option value="PY">Paraguay</option>
                            <option value="UY">Uruguay</option>
                            <option value="GY">Guyana</option>
                            <option value="SR">Suriname</option>
                            <option value="CR">Costa Rica</option>
                            <option value="PA">Panama</option>
                            <option value="GT">Guatemala</option>
                            <option value="HN">Honduras</option>
                            <option value="SV">El Salvador</option>
                            <option value="NI">Nicaragua</option>
                            <option value="CU">Cuba</option>
                            <option value="DO">Dominican Republic</option>
                            <option value="JM">Jamaica</option>
                            <option value="TT">Trinidad and Tobago</option>
                            <option value="BB">Barbados</option>
                            <option value="BS">Bahamas</option>
                            <option value="HT">Haiti</option>
                          </optgroup>
                          <optgroup label="Europe">
                            <option value="GB">United Kingdom</option>
                            <option value="IE">Ireland</option>
                            <option value="FR">France</option>
                            <option value="DE">Germany</option>
                            <option value="IT">Italy</option>
                            <option value="ES">Spain</option>
                            <option value="PT">Portugal</option>
                            <option value="NL">Netherlands</option>
                            <option value="BE">Belgium</option>
                            <option value="CH">Switzerland</option>
                            <option value="AT">Austria</option>
                            <option value="SE">Sweden</option>
                            <option value="NO">Norway</option>
                            <option value="DK">Denmark</option>
                            <option value="FI">Finland</option>
                            <option value="PL">Poland</option>
                            <option value="CZ">Czech Republic</option>
                            <option value="SK">Slovakia</option>
                            <option value="HU">Hungary</option>
                            <option value="RO">Romania</option>
                            <option value="BG">Bulgaria</option>
                            <option value="HR">Croatia</option>
                            <option value="SI">Slovenia</option>
                            <option value="RS">Serbia</option>
                            <option value="GR">Greece</option>
                            <option value="CY">Cyprus</option>
                            <option value="MT">Malta</option>
                            <option value="LU">Luxembourg</option>
                            <option value="IS">Iceland</option>
                            <option value="LT">Lithuania</option>
                            <option value="LV">Latvia</option>
                            <option value="EE">Estonia</option>
                            <option value="UA">Ukraine</option>
                            <option value="RU">Russia</option>
                            <option value="BY">Belarus</option>
                            <option value="MD">Moldova</option>
                            <option value="AL">Albania</option>
                            <option value="BA">Bosnia and Herzegovina</option>
                            <option value="ME">Montenegro</option>
                            <option value="MK">North Macedonia</option>
                            <option value="AD">Andorra</option>
                            <option value="LI">Liechtenstein</option>
                            <option value="MC">Monaco</option>
                            <option value="SM">San Marino</option>
                          </optgroup>
                          <optgroup label="Middle East">
                            <option value="AE">United Arab Emirates</option>
                            <option value="SA">Saudi Arabia</option>
                            <option value="QA">Qatar</option>
                            <option value="KW">Kuwait</option>
                            <option value="BH">Bahrain</option>
                            <option value="OM">Oman</option>
                            <option value="JO">Jordan</option>
                            <option value="LB">Lebanon</option>
                            <option value="IL">Israel</option>
                            <option value="IQ">Iraq</option>
                            <option value="IR">Iran</option>
                            <option value="SY">Syria</option>
                            <option value="YE">Yemen</option>
                          </optgroup>
                          <optgroup label="Africa">
                            <option value="ZA">South Africa</option>
                            <option value="NG">Nigeria</option>
                            <option value="KE">Kenya</option>
                            <option value="GH">Ghana</option>
                            <option value="ET">Ethiopia</option>
                            <option value="TZ">Tanzania</option>
                            <option value="UG">Uganda</option>
                            <option value="EG">Egypt</option>
                            <option value="MA">Morocco</option>
                            <option value="TN">Tunisia</option>
                            <option value="DZ">Algeria</option>
                            <option value="SN">Senegal</option>
                            <option value="CM">Cameroon</option>
                            <option value="CI">Côte d'Ivoire</option>
                            <option value="MZ">Mozambique</option>
                            <option value="ZM">Zambia</option>
                            <option value="ZW">Zimbabwe</option>
                            <option value="RW">Rwanda</option>
                            <option value="MU">Mauritius</option>
                            <option value="SC">Seychelles</option>
                            <option value="NA">Namibia</option>
                            <option value="BW">Botswana</option>
                            <option value="LS">Lesotho</option>
                            <option value="SZ">Eswatini</option>
                            <option value="MG">Madagascar</option>
                            <option value="AO">Angola</option>
                            <option value="MW">Malawi</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Row 4: Street address line 1 */}
                      <div>
                        <Label>Street address <span className="text-red-500">*</span></Label>
                        <Input
                          value={shippingAddress.line1}
                          onChange={e => setShippingAddress({ ...shippingAddress, line1: e.target.value })}
                          placeholder="House number and street name"
                        />
                      </div>

                      {/* Row 5: Street address line 2 */}
                      <div>
                        <Input
                          value={shippingAddress.line2}
                          onChange={e => setShippingAddress({ ...shippingAddress, line2: e.target.value })}
                          placeholder="Apartment, suite, unit, etc. (optional)"
                        />
                      </div>

                      {/* Row 6: Postcode — auto-fills city, state, country */}
                      <div>
                        <Label>Postcode / ZIP <span className="text-red-500">*</span></Label>
                        <div className="relative max-w-[200px]">
                          <Input
                            value={shippingAddress.postalCode}
                            onChange={e => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                            placeholder="e.g. 2000"
                            className="pr-8"
                          />
                          {postcodeLookupStatus === 'loading' && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
                          )}
                          {postcodeLookupStatus === 'found' && (
                            <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                          )}
                        </div>
                        {postcodeLookupStatus === 'notfound' && (
                          <p className="text-xs text-[#888] mt-1">Postcode not recognised — fill town, state &amp; country manually.</p>
                        )}
                        {postcodeLookupStatus === 'found' && (
                          <p className="text-xs text-green-600 mt-1">Town, state &amp; country auto-filled ✓</p>
                        )}
                      </div>

                      {/* Row 7: Town / City */}
                      <div>
                        <Label>Town / City <span className="text-red-500">*</span></Label>
                        <Input value={shippingAddress.city} onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })} placeholder="Auckland" />
                      </div>

                      {/* Row 8: State / County */}
                      <div>
                        <Label>State / County</Label>
                        <Input value={shippingAddress.state} onChange={e => setShippingAddress({ ...shippingAddress, state: e.target.value })} placeholder="e.g. Auckland" />
                      </div>

                      {/* Row 9: Phone */}
                      <div>
                        <Label>Phone <span className="text-red-500">*</span></Label>
                        <Input value={shippingAddress.phone} onChange={e => setShippingAddress({ ...shippingAddress, phone: e.target.value })} placeholder="+61 123 456 789" />
                      </div>

                    </div>
                  )}

                  {/* Shipping Method Selection - FIXED */}
                  <div className="mt-6 p-4 bg-[#f5f5f0] rounded">
                    <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Shipping Method</h3>
                    
                    {shippingLoading && (
                      <div className="flex items-center gap-2 text-sm text-[#888]">
                        <div className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
                        Calculating shipping options...
                      </div>
                    )}
                    
                    {!shippingLoading && shippingError && (
                      <p className="text-sm text-red-600">{shippingError}</p>
                    )}
                    
                    {!shippingLoading && !shippingError && shippingMethods.length === 0 && (
                      <p className="text-sm text-[#888]">No shipping methods available for this country.</p>
                    )}
                    
                    {!shippingLoading && !shippingError && shippingMethods.length > 0 && (
                      <RadioGroup 
                        value={shippingMethod} 
                        onValueChange={setShippingMethod}
                        className="space-y-2"
                      >
                        {shippingMethods.map((method) => {
                          const methodId = method.id || method.methodId || 'standard';
                          const isActive = method.active !== false;
                          const cost = parseFloat(method.cost) || 0;
                          const displayCost = method.displayCost || (cost === 0 ? 'Free' : `$${cost.toFixed(2)}`);
                          
                          return (
                            <div 
                              key={methodId} 
                              className={`flex items-center space-x-3 border p-3 rounded bg-white ${!isActive ? 'opacity-50' : ''}`}
                            >
                              <RadioGroupItem 
                                value={methodId} 
                                id={`method-${methodId}`}
                                disabled={!isActive}
                              />
                              <Label 
                                htmlFor={`method-${methodId}`} 
                                className={`flex-1 cursor-pointer ${!isActive ? 'cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[#c8a96e]">
                                      {METHOD_ICONS[methodId] || <Truck className="w-4 h-4" />}
                                    </span>
                                    <div>
                                      <p className="font-medium text-sm">{method.label || methodId}</p>
                                      <p className="text-xs text-[#888]">{method.description || ''}</p>
                                    </div>
                                  </div>
                                  <span className={`font-semibold text-sm ${cost === 0 ? 'text-green-600' : 'text-[#1a1a1a]'}`}>
                                    {displayCost}
                                  </span>
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    )}
                  </div>

                  <Button
                    onClick={() => {
                      const needsNewAddress = !isAuthenticated || !selectedAddressId || savedAddresses.length === 0;
                      if (needsNewAddress) {
                        if (!shippingAddress.fullName.trim()) { toast.error('Full name is required'); return; }
                        if (!shippingAddress.line1.trim()) { toast.error('Address line 1 is required'); return; }
                        if (!shippingAddress.city.trim()) { toast.error('City is required'); return; }
                        if (!shippingAddress.postalCode.trim()) { toast.error('Postal code is required'); return; }
                      }
                      if (!isAuthenticated && !guestEmail.trim()) { toast.error('Email address is required'); return; }
                      if (shippingMethods.length === 0) { toast.error('Please wait for shipping options to load'); return; }
                      if (!shippingMethod) { toast.error('Please select a shipping method'); return; }
                      setStep(2); scrollToTop();
                    }}
                    className="w-full mt-6 bg-[#1a1a1a] text-[#f5f5f0]"
                  >
                    Continue to Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* STEP 2 — Payment Method */}
            {step === 2 && (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Payment Method</h2>

                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as 'stripe' | 'google_pay')}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:border-[#c8a96e]">
                      <RadioGroupItem value="stripe" id="stripe" />
                      <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-[#c8a96e]" />
                          <div>
                            <p className="font-medium">Credit / Debit Card</p>
                            <p className="text-sm text-[#888]">Pay securely with Visa, Mastercard, Amex</p>
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:border-[#c8a96e]">
                      <RadioGroupItem value="google_pay" id="google_pay" />
                      <Label htmlFor="google_pay" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-[#c8a96e]" />
                          <div>
                            <p className="font-medium">Google Pay</p>
                            <p className="text-sm text-[#888]">Fast checkout with your Google account</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => { setStep(1); scrollToTop(); }}>Back</Button>
                    <Button
                      onClick={handleProceedToPayment}
                      disabled={isLoading}
                      className="flex-1 bg-[#1a1a1a] text-[#f5f5f0]"
                    >
                      {isLoading ? 'Preparing...' : 'Review & Pay'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 3 — Review + Pay */}
            {step === 3 && clientSecret && (
              <div className="space-y-4">
                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Review Your Order</h2>
                    <div className="space-y-4 mb-6">
                      {items.map((item) => (
                        <div key={item.variantId} className="flex gap-4">
                          <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-[#888]">Size: {item.size} | Color: {item.color}</p>
                            <p className="text-sm">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4 space-y-2 text-sm">
                      <div className="flex justify-between"><span>Subtotal</span><span>${getTotal().toFixed(2)}</span></div>
                      {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
                      {giftWrap && <div className="flex justify-between"><span>Gift Wrap</span><span>$5.00</span></div>}
                      <div className="flex justify-between">
                        <span>Shipping ({shippingMethods.find(m => (m.id || m.methodId) === shippingMethod)?.label || shippingMethod})</span>
                        <span className={shippingCost === 0 ? "text-green-600" : ""}>
                          {shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg pt-1 border-t"><span>Total</span><span>${subtotal.toFixed(2)}</span></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">
                      {paymentMethod === 'google_pay' ? 'Pay with Google Pay' : 'Enter Card Details'}
                    </h2>
                    <Elements
                      stripe={stripePromise}
                      options={{ clientSecret, appearance: { theme: 'stripe' } }}
                    >
                      <StripePaymentForm
                        total={subtotal}
                        clientSecret={clientSecret}
                        onSuccess={handlePaymentSuccess}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                        paymentMethod={paymentMethod}
                      />
                    </Elements>
                    <Button variant="outline" className="w-full mt-3" onClick={() => { setStep(2); scrollToTop(); }}>
                      Back
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* ── Order Summary Sidebar ── */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-0 shadow-sm sticky top-24">
              <CardContent className="p-6">
                <h3 className="font-semibold text-[#1a1a1a] mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between text-[#555]">
                    <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                    <span>${getTotal().toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span><span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  {giftWrap && (
                    <div className="flex justify-between text-[#555]">
                      <span>Gift Wrap</span><span>$5.00</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#555] items-center">
                    <span>Shipping</span>
                    <div className="text-right">
                      {shippingLoading ? (
                        <span className="text-sm text-[#888]">...</span>
                      ) : shippingMethods.length > 1 ? (
                        <select
                          value={shippingMethod}
                          onChange={e => setShippingMethod(e.target.value)}
                          className="text-sm border border-[#ddd] rounded px-2 py-1 bg-white"
                        >
                          {shippingMethods.filter(m => m.active !== false).map(m => (
                            <option key={m.id || m.methodId} value={m.id || m.methodId}>
                              {m.label} — {m.displayCost || (parseFloat(m.cost) === 0 ? 'Free' : `$${parseFloat(m.cost).toFixed(2)}`)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={shippingCost === 0 ? "text-green-600" : ""}>
                          {shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold text-lg text-[#1a1a1a]">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
                {shippingMethod && shippingMethods.length > 0 && (
                  <p className="text-xs text-[#888] mt-2 text-center">
                    {shippingMethods.find(m => (m.id || m.methodId) === shippingMethod)?.description}
                  </p>
                )}
                {!isAuthenticated && (
                  <p className="text-xs text-[#888] mt-3 text-center">
                    Checking out as guest
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}