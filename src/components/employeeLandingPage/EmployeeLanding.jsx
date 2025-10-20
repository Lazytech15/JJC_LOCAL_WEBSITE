import { Link } from "react-router-dom"
import { Wrench, Cog, Building2, Truck, Factory, Phone, Mail, MapPin, Clock, ChevronRight, Menu, X, ChevronLeft, ArrowUp } from "lucide-react"
import { useState, useEffect } from "react"
import logo from "../../assets/companyLogo.jpg"
import Gallery from "./Gallery"
import apiService from '../../utils/api/api-service'

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
  const [carouselImages, setCarouselImages] = useState([])
  const [galleryImages, setGalleryImages] = useState([])
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(true)
  const [isLoadingGallery, setIsLoadingGallery] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  

  // Load landing page images for carousel
    useEffect(() => {
    const loadCarouselImages = async () => {
      try {
        setIsLoadingCarousel(true)
        
        // Get list of images (cached automatically)
        const response = await apiService.profiles.getLandingImages()
        
        if (response.success && response.data.images.length > 0) {
          // Load each image blob with direct caching
          const imagePromises = response.data.images.map(async (img) => {
            const blobResult = await apiService.profiles.getLandingImageBlob(img.filename)
            return blobResult.success ? blobResult.url : null
          })
          
          const imageUrls = await Promise.all(imagePromises)
          const validUrls = imageUrls.filter(url => url !== null)
          
          setCarouselImages(validUrls)
          console.log(`[Landing] Loaded ${validUrls.length} carousel images (cached)`)
        } else {
          setCarouselImages([])
        }
      } catch (error) {
        console.error("Error loading carousel images:", error)
        setCarouselImages([])
      } finally {
        setIsLoadingCarousel(false)
      }
    }

    loadCarouselImages()
  }, [])

  // Load gallery images
  useEffect(() => {
    const loadGalleryImages = async () => {
      try {
        setIsLoadingGallery(true)
        
        // Get list of images (cached automatically)
        const response = await apiService.profiles.getGalleryImages()
        
        if (response.success && response.data.images.length > 0) {
          // Load each image blob with direct caching
          const imagePromises = response.data.images.map(async (img) => {
            const blobResult = await apiService.profiles.getGalleryImageBlob(img.filename)
            return blobResult.success ? blobResult.url : null
          })
          
          const imageUrls = await Promise.all(imagePromises)
          const validUrls = imageUrls.filter(url => url !== null)
          
          setGalleryImages(validUrls)
          console.log(`[Landing] Loaded ${validUrls.length} gallery images (cached)`)
        }
      } catch (error) {
        console.error("Error loading gallery images:", error)
      } finally {
        setIsLoadingGallery(false)
      }
    }

    loadGalleryImages()
  }, [])

  // Auto-advance carousel
  useEffect(() => {
    if (carouselImages.length === 0) return
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [carouselImages.length])

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

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
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                <img
                  src={logo}
                  alt="JJC Engineering Works Logo"
                  className="w-12 h-12 rounded-sm object-cover shadow-md bg-primary"
                />
              </div>
              <div className="flex justify-center text-white drop-shadow-lg">
                <div className="flex gap-2 text-center items-center">
                  <h1 className="text-5xl califoniaFont tracking-wide">JJC</h1>
                  <div className="text-left">
                    <p className="text-sm califoniaFont font-semibold uppercase leading-tight">Engineering Works</p>
                    <hr className=" border-white/70" />
                    <p className="text-sm font-semibold califoniaFont uppercase text-white">& General Services</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-white hover:text-white/80 transition-colors font-medium drop-shadow-lg">
                Services
              </a>
              <a href="#gallery" className="text-white hover:text-white/80 transition-colors font-medium drop-shadow-lg">
                Gallery
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
              <a href="#gallery" className="block text-white hover:text-white/80 transition-colors font-medium">
                Gallery
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
          {isLoadingCarousel ? (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
              <div className="text-white text-xl">Loading...</div>
            </div>
          ) : carouselImages.length === 0 ? (
            <div className="absolute inset-0 bg-zinc-900" />
          ) : (
            carouselImages.map((image, index) => (
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
                {/* Darker overlay with blur for text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
              </div>
            ))
          )}
        </div>

        {/* Carousel Indicators */}
        {carouselImages.length > 1 && (
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
        )}

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

      {/* Gallery Section */}
      <section id="gallery" className="bg-zinc-50">
        <Gallery images={galleryImages} isLoading={isLoadingGallery} />
      </section>

      <section className="py-20 bg-white">
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

      <section className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-zinc-900 mb-4">Industries We Serve</h3>
            <p className="text-lg text-zinc-600">Trusted by leading companies across multiple sectors</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {industries.map((industry, index) => (
              <div
                key={index}
                className="px-8 py-4 rounded-full border-2 border-zinc-300 bg-white hover:border-zinc-900 hover:bg-zinc-100 text-zinc-900 transition-all cursor-default font-semibold"
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

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 w-14 h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}