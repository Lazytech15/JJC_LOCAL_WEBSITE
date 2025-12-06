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
      
      const response = await apiService.profiles.getLandingImages()
      
      if (response.success && response.data.images.length > 0) {
        // Return URLs immediately
        const imageUrls = response.data.images.map(img => 
          apiService.profiles.getLandingImageUrl(img.filename)
        )
        
        // Set images right away - no waiting
        setCarouselImages(imageUrls)
        setIsLoadingCarousel(false)
        
        console.log(`[Landing] Loaded ${imageUrls.length} carousel images`)
        
        // Cache in background
        response.data.images.forEach(async (img) => {
          try {
            await apiService.profiles.getLandingImageBlob(img.filename)
          } catch (error) {
            console.warn(`[Landing] Background cache failed: ${img.filename}`)
          }
        })
      } else {
        setCarouselImages([])
        setIsLoadingCarousel(false)
      }
    } catch (error) {
      console.error("Error loading carousel images:", error)
      setCarouselImages([])
      setIsLoadingCarousel(false)
    }
  }

  loadCarouselImages()
}, [])

// 3. UPDATE Gallery images - Same pattern
useEffect(() => {
  const loadGalleryImages = async () => {
    try {
      setIsLoadingGallery(true)
      
      const response = await apiService.profiles.getGalleryImages()
      
      if (response.success && response.data.images.length > 0) {
        // Return URLs immediately
        const imageUrls = response.data.images.map(img => 
          apiService.profiles.getGalleryImageUrl(img.filename)
        )
        
        // Set images right away
        setGalleryImages(imageUrls)
        setIsLoadingGallery(false)
        
        console.log(`[Landing] Loaded ${imageUrls.length} gallery images`)
        
        // Cache in background
        response.data.images.forEach(async (img) => {
          try {
            await apiService.profiles.getGalleryImageBlob(img.filename)
          } catch (error) {
            console.warn(`[Gallery] Background cache failed: ${img.filename}`)
          }
        })
      } else {
        setGalleryImages([])
        setIsLoadingGallery(false)
      }
    } catch (error) {
      console.error("Error loading gallery images:", error)
      setGalleryImages([])
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
      <nav className="absolute top-0 left-0 right-0 z-50 bg-linear-to-b from-black/60 to-transparent">
        <div className="max-w-8xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                <img
                  src={logo}
                  alt="JJC Engineering Works Logo"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm object-cover shadow-md bg-primary"
                />
              </div>
              <div className="flex justify-center text-white drop-shadow-lg">
                <div className="flex gap-1.5 sm:gap-2 text-center items-center">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl califoniaFont tracking-wide">JJC</h1>
                  <div className="text-left hidden xs:block">
                    <p className="text-[10px] sm:text-xs lg:text-sm califoniaFont font-semibold uppercase leading-tight">Engineering Works</p>
                    <hr className="border-white/70" />
                    <p className="text-[10px] sm:text-xs lg:text-sm font-semibold califoniaFont uppercase text-white">& General Services</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4 lg:gap-8">
              <a href="#services" className="text-white hover:text-white/80 transition-colors font-medium drop-shadow-lg text-sm lg:text-base">
                Services
              </a>
              <a href="#gallery" className="text-white hover:text-white/80 transition-colors font-medium drop-shadow-lg text-sm lg:text-base">
                Gallery
              </a>
              <a href="#about" className="text-white hover:text-white/80 transition-colors font-medium drop-shadow-lg text-sm lg:text-base">
                About
              </a>
              <a href="#contact" className="text-white hover:text-white/80 transition-colors font-medium drop-shadow-lg text-sm lg:text-base">
                Contact
              </a>
              <Link to="/employee/login" className="block">
                <Button className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 shadow-lg text-sm lg:text-base">
                  Login
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 sm:py-4 space-y-2 sm:space-y-3 bg-black/80 backdrop-blur-md rounded-lg mt-2 px-3 sm:px-4">
              <a href="#services" className="block text-white hover:text-white/80 transition-colors font-medium text-sm sm:text-base py-1">
                Services
              </a>
              <a href="#gallery" className="block text-white hover:text-white/80 transition-colors font-medium text-sm sm:text-base py-1">
                Gallery
              </a>
              <a href="#about" className="block text-white hover:text-white/80 transition-colors font-medium text-sm sm:text-base py-1">
                About
              </a>
              <a href="#contact" className="block text-white hover:text-white/80 transition-colors font-medium text-sm sm:text-base py-1">
                Contact
              </a>
              <Link to="/employee/login" className="block pt-2">
                <Button className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 text-sm sm:text-base">
                  Employee Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section with Carousel */}
      <section className="relative h-[100svh] min-h-[500px] overflow-hidden">
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
                <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/60 to-black/80" />
              </div>
            ))
          )}
        </div>

        {/* Carousel Indicators */}
        {carouselImages.length > 1 && (
          <div className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 sm:gap-2">
            {carouselImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 sm:h-2 rounded-full transition-all ${
                  index === currentSlide ? "w-6 sm:w-8 bg-white" : "w-1.5 sm:w-2 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-20 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="text-center max-w-4xl mx-auto pt-16 sm:pt-0">
              <div className="inline-block mb-4 sm:mb-6">
                <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs sm:text-sm font-semibold border border-white/30 shadow-lg">
                  Excellence Since 1996
                </span>
              </div>
              <h2 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 text-balance leading-tight drop-shadow-2xl px-2">
                Integrating Tomorrow's Technologies with Today's Industries
              </h2>
              <p className="text-sm xs:text-base sm:text-lg lg:text-xl text-white/95 mb-6 sm:mb-10 text-pretty leading-relaxed drop-shadow-lg px-4 sm:px-0">
                Committed to Excellence - Providing creative and cost-effective solutions to industrial problems
              </p>
              <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
                <a href="#services">
                  <Button
                    size="lg"
                    className="w-full xs:w-auto bg-white text-zinc-900 hover:bg-white/90 text-sm sm:text-base h-11 sm:h-14 px-6 sm:px-8 shadow-xl"
                  >
                    Explore Services
                    <ChevronRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 inline" />
                  </Button>
                </a>
                {/* <Link to="/employee/login" className="block">
                  <Button
                    size="lg"
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 text-base h-14 px-8 shadow-xl"
                  >
                    Employee Portal
                  </Button>
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-12 sm:py-16 lg:py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 mb-3 sm:mb-4">About JJC Engineering Works</h3>
            <p className="text-sm sm:text-base lg:text-lg text-zinc-600 max-w-3xl mx-auto text-pretty leading-relaxed px-2">
              Founded in 1996 as Entourage Enterprises and established as JJC Engineering Works & General Services in
              2001, we specialize in Mechanical, Electrical, Civil & Structural Works.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-zinc-100 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                  <Cog className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-900" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-zinc-900">Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600 leading-relaxed text-sm sm:text-base">
                  Committed to delivering the highest quality workmanship and customer satisfaction in every project.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-zinc-100 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                  <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-900" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-zinc-900">Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600 leading-relaxed text-sm sm:text-base">
                  Providing creative and cost-effective solutions to complex industrial challenges.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow sm:col-span-2 md:col-span-1">
              <CardHeader>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-zinc-100 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                  <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-900" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-zinc-900">Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600 leading-relaxed text-sm sm:text-base">
                  Building lasting relationships through competent service and competitive pricing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="services" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 mb-3 sm:mb-4">Our Services</h3>
            <p className="text-sm sm:text-base lg:text-lg text-zinc-600">Comprehensive industrial solutions for your business needs</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <Card key={index} className="bg-white border border-zinc-200 shadow-md hover:shadow-xl transition-all hover:-translate-y-1">
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-zinc-900 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 shadow-md">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                    </div>
                    <CardTitle className="text-sm sm:text-base lg:text-lg text-zinc-900 leading-tight">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">{service.description}</p>
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

      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 mb-3 sm:mb-4">Plant Capabilities</h3>
            <p className="text-sm sm:text-base lg:text-lg text-zinc-600">State-of-the-art machinery for precision manufacturing</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {machinery.map((machine, index) => (
              <div
                key={index}
                className="p-3 sm:p-4 lg:p-5 bg-white rounded-xl sm:rounded-2xl border border-zinc-200 hover:border-zinc-900 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-900 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <Cog className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <p className="font-semibold text-zinc-900 text-xs sm:text-sm">{machine}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 mb-3 sm:mb-4">Industries We Serve</h3>
            <p className="text-sm sm:text-base lg:text-lg text-zinc-600">Trusted by leading companies across multiple sectors</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4">
            {industries.map((industry, index) => (
              <div
                key={index}
                className="px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 rounded-full border-2 border-zinc-300 bg-white hover:border-zinc-900 hover:bg-zinc-100 text-zinc-900 transition-all cursor-default font-semibold text-xs sm:text-sm lg:text-base"
              >
                <p>{industry}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-12 sm:py-16 lg:py-20 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Get In Touch</h3>
            <p className="text-base sm:text-lg lg:text-xl opacity-90">Why Not Put Us To Test</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
              </div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg">Address</h4>
              <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                B-3, L-11, South Carolina St.
                <br />
                Joyous Heights Subd., Hinapao
                <br />
                San Jose, Antipolo City
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Phone className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
              </div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg">Phone</h4>
              <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                +632 82882686
                <br />
                +632 70049842
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Mail className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
              </div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg">Email</h4>
              <p className="text-xs sm:text-sm opacity-90 break-all">jjcenggworks@yahoo.com</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
              </div>
              <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg">Business Hours</h4>
              <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                Monday - Friday
                <br />
                8:00 AM - 5:00 PM
              </p>
            </div>
          </div>

          <div className="mt-10 sm:mt-12 lg:mt-16 text-center">
            <p className="text-xs sm:text-sm opacity-80">
              Tax ID: 106-612-798-000-VAT
              <br />
              Banking Partners: BPI, BDO, BPI Family Bank
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-zinc-950 text-zinc-400 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs sm:text-sm">
              © {new Date().getFullYear()} JJC Engineering Works & General Services. All rights reserved.
            </p>
            <p className="text-[10px] sm:text-xs mt-2 opacity-75">Integrating Tomorrow's Technologies with Today's Industries</p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-40 w-11 h-11 sm:w-14 sm:h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}
    </div>
  )
}