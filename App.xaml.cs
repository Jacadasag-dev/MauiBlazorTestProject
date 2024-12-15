namespace JD.MauiBlazorUITestProject
{
    public partial class App : Application
    {
        public App()
        {
            InitializeComponent();
            MainPage = new MainPage();
        }

#pragma warning disable CS8765 // Nullability of type of parameter doesn't match overridden member (possibly because of nullability attributes).
        protected override Window CreateWindow(IActivationState activationState)
#pragma warning restore CS8765 // Nullability of type of parameter doesn't match overridden member (possibly because of nullability attributes).
        {

            var window = base.CreateWindow(activationState);

            const int newWidth = 1220;
            const int newHeight = 880;

            window.Width = newWidth;
            window.Height = newHeight;
            window.MinimumWidth = 1100;
            window.MinimumHeight = 420;

            window.Title = "TestProject";

            return window;
        }
    }
}

