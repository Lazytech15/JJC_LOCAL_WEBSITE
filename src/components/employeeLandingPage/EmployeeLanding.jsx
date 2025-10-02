import { Link } from "react-router-dom"
import { Wrench, Cog, Building2, Truck, Factory, Phone, Mail, MapPin, Clock, ChevronRight, Menu, X, ChevronLeft } from "lucide-react"
import { useState, useEffect } from "react"
import logo from "../../assets/companyLogo.jpg"

const Button = ({ children, className = "", size = "default", ...props }) => {
  const sizeClasses = {
    default: "px-4 py-2",
    lg: "px-6 py-3"
  }
  return (
    <button
      className={`rounded-lg font-semibold transition-all ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl ${className}`}>{children}</div>
)

const CardHeader = ({ children }) => <div className="p-6 pb-3">{children}</div>
const CardTitle = ({ children, className = "" }) => <h3 className={`font-bold ${className}`}>{children}</h3>
const CardContent = ({ children }) => <div className="p-6 pt-0">{children}</div>

export default function EmployeeLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Carousel images - replace these URLs with your actual images
  const carouselImages = [
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1920&q=80", // Industrial machinery
    "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=1920&q=80", // Factory floor
    "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1920&q=80", // Engineering work
    "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1920&q=80", // Metal fabrication
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)
  }

  const services = [
    {
      icon: Cog,
      title: "Machine Shop Services",
      description: "General fabrication and precision machining",
    },
    {
      icon: Wrench,
      title: "Parts Fabrication",
      description: "Gears, shafting, and custom metal fabrication",
    },
    {
      icon: Building2,
      title: "Installation & Erection",
      description: "Civil, Mechanical, and Electrical systems",
    },
    {
      icon: Cog,
      title: "Repairs & Maintenance",
      description: "Industrial equipment servicing",
    },
    {
      icon: Factory,
      title: "Oil Mill Solutions",
      description: "Support machinery, parts supply, upgrades",
    },
    {
      icon: Truck,
      title: "Conveyors & Material Handling",
      description: "Screw, belt, shuttle conveyors, bucket elevators",
    },
    {
      icon: Building2,
      title: "Structural Works",
      description: "Steel warehouse construction, design services",
    },
    {
      icon: Building2,
      title: "Roofing & Cladding",
      description: "Industrial roofing installation",
    },
    {
      icon: Wrench,
      title: "Telecom Infrastructure",
      description: "Tower fabrication and erection",
    },
    {
      icon: Factory,
      title: "Feed Mills",
      description: "Installation and repair services",
    },
    {
      icon: Cog,
      title: "Crane Services",
      description: "Gantry and overhead crane repair/installation",
    },
    {
      icon: Wrench,
      title: "Equipment Repair",
      description: "Hand pallet trucks and industrial equipment",
    },
  ]

  const machinery = [
    "Gear Hobbers",
    "Lathe Machines",
    "Milling Machines",
    "Jig Borer",
    "Shaper",
    "Drill & Mechanical Press",
    "Welding Machines",
    "Cylindrical Grinder",
    "Slotter",
    "Hydraulic Press",
    "Mechanical Hacksaw",
    "Tool & Cutter Grinder",
  ]

  const industries = ["Oil Mills", "Telecommunications", "Cement", "Mining", "Construction", "Packaging", "Publishing"]

  return (
    <div className="min-h-screen bg-white">
      {/* Transparent Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                <img
                src={logo}
                alt="JJC Engineering Works Logo"
                className="w-12 h-12 rounded-sm object-cover shadow-md bg-primary"
              />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white drop-shadow-lg">JJCEWS</h1>
                <p className="text-xs text-white/90 font-medium drop-shadow">Since 1996</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-white hover:text-white/80 transition-colors font-medium drop-shadow-lg">
                Services
              </a>
              <a href="#about" className="text-white hover:text-white/80 transition-colors font-medium drop-shadow-lg">
                About
              </a>
              <a href="#contact" className="text-white hover:text-white/80 transition-colors font-medium drop-shadow-lg">
                Contact
              </a>
              <Link to="/employee/login" className="block">
                <Button className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 shadow-lg">
                  Login
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-3 bg-black/80 backdrop-blur-md rounded-lg mt-2 px-4">
              <a href="#services" className="block text-white hover:text-white/80 transition-colors font-medium">
                Services
              </a>
              <a href="#about" className="block text-white hover:text-white/80 transition-colors font-medium">
                About
              </a>
              <a href="#contact" className="block text-white hover:text-white/80 transition-colors font-medium">
                Contact
              </a>
              <Link to="/employee/login" className="block">
                <Button className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30">
                  Employee Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section with Carousel */}
      <section className="relative h-screen overflow-hidden">
        {/* Carousel Images */}
        <div className="absolute inset-0">
          {carouselImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={image}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Darker overlay with blur for text readability backdrop-blur-sm*/}
              <div className="absolute inset-0 bg-gradient-to-b from-black/100 via-black/90 to-black/110 " />
            </div>
          ))}
        </div>

        {/* Carousel Controls */}
        {/* <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all border border-white/30 shadow-lg"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all border border-white/30 shadow-lg"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button> */}

        {/* Carousel Indicators */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-20 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-block mb-6">
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-semibold border border-white/30 shadow-lg">
                  Excellence Since 1996
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance leading-tight drop-shadow-2xl">
                Integrating Tomorrow's Technologies with Today's Industries
              </h2>
              <p className="text-xl text-white/95 mb-10 text-pretty leading-relaxed drop-shadow-lg">
                Committed to Excellence - Providing creative and cost-effective solutions to industrial problems
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#services">
                  <Button
                    size="lg"
                    className="bg-white text-zinc-900 hover:bg-white/90 text-base h-14 px-8 shadow-xl"
                  >
                    Explore Services
                    <ChevronRight className="ml-2 w-5 h-5 inline" />
                  </Button>
                </a>
                <Link to="/employee/login" className="block">
                <Button
                  size="lg"
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 text-base h-14 px-8 shadow-xl"
                >
                  Employee Portal
                </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-zinc-900 mb-4">About JJC Engineering Works</h3>
            <p className="text-lg text-zinc-600 max-w-3xl mx-auto text-pretty leading-relaxed">
              Founded in 1996 as Entourage Enterprises and established as JJC Engineering Works & General Services in
              2001, we specialize in Mechanical, Electrical, Civil & Structural Works.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
                  <Cog className="w-8 h-8 text-zinc-900" />
                </div>
                <CardTitle className="text-2xl text-zinc-900">Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600 leading-relaxed">
                  Committed to delivering the highest quality workmanship and customer satisfaction in every project.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
                  <Wrench className="w-8 h-8 text-zinc-900" />
                </div>
                <CardTitle className="text-2xl text-zinc-900">Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600 leading-relaxed">
                  Providing creative and cost-effective solutions to complex industrial challenges.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-zinc-900" />
                </div>
                <CardTitle className="text-2xl text-zinc-900">Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600 leading-relaxed">
                  Building lasting relationships through competent service and competitive pricing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-zinc-900 mb-4">Our Services</h3>
            <p className="text-lg text-zinc-600">Comprehensive industrial solutions for your business needs</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <Card key={index} className="bg-white border border-zinc-200 shadow-md hover:shadow-xl transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mb-3 shadow-md">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-lg text-zinc-900">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-600 leading-relaxed">{service.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-zinc-900 mb-4">Plant Capabilities</h3>
            <p className="text-lg text-zinc-600">State-of-the-art machinery for precision manufacturing</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {machinery.map((machine, index) => (
              <div
                key={index}
                className="p-5 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-900 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Cog className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-semibold text-zinc-900 text-sm">{machine}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-zinc-900 mb-4">Industries We Serve</h3>
            <p className="text-lg text-zinc-600">Trusted by leading companies across multiple sectors</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {industries.map((industry, index) => (
              <div
                key={index}
                className="px-8 py-4 rounded-full border-2 border-zinc-300 bg-zinc-50 hover:border-zinc-900 hover:bg-zinc-100 text-zinc-900 transition-all cursor-default font-semibold"
              >
                <p>{industry}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">Get In Touch</h3>
            <p className="text-xl opacity-90">Why Not Put Us To Test</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8" />
              </div>
              <h4 className="font-semibold mb-3 text-lg">Address</h4>
              <p className="text-sm opacity-90 leading-relaxed">
                B-3, L-11, South Carolina St.
                <br />
                Joyous Heights Subd., Hinapao
                <br />
                San Jose, Antipolo City
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8" />
              </div>
              <h4 className="font-semibold mb-3 text-lg">Phone</h4>
              <p className="text-sm opacity-90 leading-relaxed">
                +632 82882686
                <br />
                +632 70049842
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h4 className="font-semibold mb-3 text-lg">Email</h4>
              <p className="text-sm opacity-90">jjcenggworks@yahoo.com</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h4 className="font-semibold mb-3 text-lg">Business Hours</h4>
              <p className="text-sm opacity-90 leading-relaxed">
                Monday - Friday
                <br />
                8:00 AM - 5:00 PM
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-sm opacity-80">
              Tax ID: 106-612-798-000-VAT
              <br />
              Banking Partners: BPI, BDO, BPI Family Bank
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-zinc-950 text-zinc-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              © {new Date().getFullYear()} JJC Engineering Works & General Services. All rights reserved.
            </p>
            <p className="text-xs mt-2 opacity-75">Integrating Tomorrow's Technologies with Today's Industries</p>
          </div>
        </div>
      </footer>
    </div>
  )
}