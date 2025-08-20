using Cashfree_Project.Config;

var builder = WebApplication.CreateBuilder(args);

// Bind CashfreeConfig -> CashfreeSettings
builder.Services.Configure<CashfreeSettings>(
    builder.Configuration.GetSection("CashfreeConfig")
);

builder.Services.AddRazorPages();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();
app.MapRazorPages();
app.Run();
