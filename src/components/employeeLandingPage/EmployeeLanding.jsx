import { Link } from "react-router-dom"
import { Wrench, Cog, Building2, Truck, Factory, Phone, Mail, MapPin, Clock, ChevronRight, Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/UiComponents"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/UiComponents"
import logo from "../../assets/companyLogo.jpg"

export default function EmployeeLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      <nav className="bg-white border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-md">
                <img
                src={logo}
                alt="JJC Engineering Works Logo"
                className="w-12 h-12 rounded-sm object-cover shadow-md bg-primary"
              />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">JJC Engineering Works</h1>
                <p className="text-xs text-muted-foreground font-medium">Since 1996</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-foreground hover:text-primary transition-colors font-medium">
                Services
              </a>
              <a href="#about" className="text-foreground hover:text-primary transition-colors font-medium">
                About
              </a>
              <a href="#contact" className="text-foreground hover:text-primary transition-colors font-medium">
                Contact
              </a>
              <Link to="/employee/login">
                <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">Login</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-3 border-t border-border">
              <a href="#services" className="block text-foreground hover:text-primary transition-colors font-medium">
                Services
              </a>
              <a href="#about" className="block text-foreground hover:text-primary transition-colors font-medium">
                About
              </a>
              <a href="#contact" className="block text-foreground hover:text-primary transition-colors font-medium">
                Contact
              </a>
              <Link to="/employee/login" className="block">
                <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                  Employee Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-secondary/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 bg-primary/10 text-primary-foreground rounded-full text-sm font-semibold">
                Excellence Since 1996
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance leading-tight">
              Integrating Tomorrow's Technologies with Today's Industries
            </h2>
            <p className="text-xl text-muted-foreground mb-10 text-pretty leading-relaxed">
              Committed to Excellence - Providing creative and cost-effective solutions to industrial problems
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#services">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-base h-14 px-8"
                >
                  Explore Services
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </a>
              <Link to="/employee/login">
                <Button
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-base h-14 px-8"
                >
                  Employee Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-foreground mb-4">About JJC Engineering Works</h3>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
              Founded in 1996 as Entourage Enterprises and established as JJC Engineering Works & General Services in
              2001, we specialize in Mechanical, Electrical, Civil & Structural Works.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Cog className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Committed to delivering the highest quality workmanship and customer satisfaction in every project.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Wrench className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-2xl">Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Providing creative and cost-effective solutions to complex industrial challenges.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
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
            <h3 className="text-4xl font-bold text-foreground mb-4">Our Services</h3>
            <p className="text-lg text-muted-foreground">Comprehensive industrial solutions for your business needs</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <Card key={index} className="border-0 shadow-md hover:shadow-xl transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div
                      className={`w-14 h-14 ${index % 2 === 0 ? "bg-primary" : "bg-secondary"} rounded-2xl flex items-center justify-center mb-3 shadow-md`}
                    >
                      <Icon
                        className={`w-7 h-7 ${index % 2 === 0 ? "text-primary-foreground" : "text-secondary-foreground"}`}
                      />
                    </div>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-foreground mb-4">Plant Capabilities</h3>
            <p className="text-lg text-muted-foreground">State-of-the-art machinery for precision manufacturing</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {machinery.map((machine, index) => (
              <div
                key={index}
                className="p-5 bg-white rounded-2xl border border-border hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Cog className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <p className="font-semibold text-foreground text-sm">{machine}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-foreground mb-4">Industries We Serve</h3>
            <p className="text-lg text-muted-foreground">Trusted by leading companies across multiple sectors</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {industries.map((industry, index) => (
              <div
                key={index}
                className={`px-8 py-4 rounded-full border-2 transition-all cursor-default font-semibold ${
                  index % 2 === 0
                    ? "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 text-primary-foreground"
                    : "border-secondary/30 bg-secondary/5 hover:border-secondary hover:bg-secondary/10 text-secondary-foreground"
                }`}
              >
                <p>{industry}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 bg-primary text-primary-foreground">
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

      <footer className="bg-foreground text-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm opacity-90">
              © {new Date().getFullYear()} JJC Engineering Works & General Services. All rights reserved.
            </p>
            <p className="text-xs mt-2 opacity-75">Integrating Tomorrow's Technologies with Today's Industries</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
