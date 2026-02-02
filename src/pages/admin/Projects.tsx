import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { projectAPI } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useLocation} from "react-router-dom";
import { useEffect } from "react";



const CreateProject = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpNumber, setGpNumber] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    projectType: "",
    piName: "",
    piEmail: "",
    department: "",
    duration: "",
    proposedBudget: "",
    description: ""
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Form submitted with data:", formData);
    
    // Validation
    if (!formData.title || !formData.projectType || !formData.piName || !formData.piEmail || !formData.department || !formData.duration || !formData.proposedBudget) {
      setError("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.piEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const projectData = {
        title: formData.title,
        projectType: formData.projectType,
        piName: formData.piName,
        piEmail: formData.piEmail,
        department: formData.department,
        duration: parseInt(formData.duration),
        proposedBudget: parseFloat(formData.proposedBudget),
        description: formData.description,
        status: "pending"
      };

      console.log("Sending to API:", projectData);

      const response = await projectAPI.create(projectData);

      console.log("API Response:", response);

      if (response.success) {
        setSuccess(true);
        setGpNumber(response.gpNumber);
        
        // Reset form
        setFormData({
          title: "",
          projectType: "",
          piName: "",
          piEmail: "",
          department: "",
          duration: "",
          proposedBudget: "",
          description: ""
        });

        // Redirect after 3 seconds
        setTimeout(() => {
          navigate("/admin/projects");
        }, 3000);
      } else {
        setError(response.message || "Failed to create project");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err instanceof Error ? err.message : "Failed to create project. Make sure backend is running on http://localhost:8000");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Project</h1>
          <p className="text-muted-foreground mt-1">Register a new research project and assign GP number</p>
        </div>

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Success!</strong> Project created successfully with GP Number: <strong>{gpNumber}</strong>
              <br />
              <span className="text-sm">Redirecting to projects page...</span>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Enter complete project information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Row 1: Title and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter project title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectType">Project Type *</Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value) => handleChange("projectType", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring">Recurring</SelectItem>
                      <SelectItem value="non-recurring">Non-Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: PI Name and Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="piName">Principal Investigator Name *</Label>
                  <Input
                    id="piName"
                    placeholder="Dr. John Smith"
                    value={formData.piName}
                    onChange={(e) => handleChange("piName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="piEmail">PI Email *</Label>
                  <Input
                    id="piEmail"
                    type="email"
                    placeholder="pi@ifms.edu"
                    value={formData.piEmail}
                    onChange={(e) => handleChange("piEmail", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Row 3: Department and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => handleChange("department", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science & Engineering">Computer Science & Engineering</SelectItem>
                      <SelectItem value="Electronics & Communication">Electronics & Communication</SelectItem>
                      <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                      <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                      <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                      <SelectItem value="Chemical Engineering">Chemical Engineering</SelectItem>
                      <SelectItem value="Biotechnology">Biotechnology</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Project Duration (Months) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="24"
                    min="1"
                    max="60"
                    value={formData.duration}
                    onChange={(e) => handleChange("duration", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Row 4: Budget */}
              <div className="space-y-2">
                <Label htmlFor="proposedBudget">Proposed Budget (₹) *</Label>
                <Input
                  id="proposedBudget"
                  type="number"
                  placeholder="5000000"
                  min="0"
                  step="1000"
                  value={formData.proposedBudget}
                  onChange={(e) => handleChange("proposedBudget", e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter amount in rupees (e.g., 5000000 for 50 Lakhs)
                </p>
              </div>

              {/* Row 5: Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter detailed project description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/projects")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Project...
                    </>
                  ) : (
                    "Create Project & Generate GP Number"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
     

    </Layout>
  );
};

export default CreateProject;